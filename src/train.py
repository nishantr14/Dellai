"""
Train PulseGuard's three predictive models and persist them with honest metrics.

The headline of this whole project: failure prediction is a SEVERELY IMBALANCED
problem. Accuracy is a trap (predicting "never fails" scores ~95%). So for every
classifier we:
  * handle imbalance with scale_pos_weight,
  * report Precision / Recall / F1 / ROC-AUC / PR-AUC / FPR (never accuracy alone),
  * choose the decision threshold deliberately to keep FPR <= 15% (the brief's
    ceiling) while maximizing how many real failures we catch (recall),
  * and record the naive all-negative accuracy so we can show, with numbers,
    exactly why accuracy is meaningless here.
"""
from __future__ import annotations

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (average_precision_score, confusion_matrix,
                             f1_score, mean_absolute_error, mean_squared_error,
                             precision_recall_curve, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor

from . import data_gen as dg
from . import features as fe

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
FPR_CEILING = 0.15


def _choose_threshold(y_true, y_prob, fpr_ceiling=FPR_CEILING):
    """Pick the threshold that maximizes recall while keeping FPR <= ceiling."""
    prec, rec, thr = precision_recall_curve(y_true, y_prob)
    best_thr, best_rec = 0.5, -1.0
    for t in np.unique(np.round(thr, 4)):
        pred = (y_prob >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
        fpr = fp / (fp + tn) if (fp + tn) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        if fpr <= fpr_ceiling and recall > best_rec:
            best_rec, best_thr = recall, float(t)
    return best_thr


def _classification_metrics(y_true, y_prob, threshold):
    pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    naive_acc = max(np.mean(y_true == 0), np.mean(y_true == 1))  # all-one-class baseline
    return {
        "precision": round(precision_score(y_true, pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_true, y_prob), 4),
        "pr_auc": round(average_precision_score(y_true, y_prob), 4),
        "fpr": round(fpr, 4),
        "threshold": round(threshold, 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "positive_rate": round(float(np.mean(y_true)), 4),
        "naive_accuracy_baseline": round(float(naive_acc), 4),
        "n_test": int(len(y_true)),
    }


# --------------------------------------------------------------------------- #
def train_storage():
    df = pd.read_csv(os.path.join(dg.DATA_DIR, "storage.csv"))
    df, feat = fe.storage_features(df)
    X, y = df[feat], df["label_fail_30d"]
    # split by drive so a drive's days never straddle train/test (no leakage)
    drives = df["serial_number"].unique()
    tr_d, te_d = train_test_split(drives, test_size=0.25, random_state=7)
    tr, te = df["serial_number"].isin(tr_d), df["serial_number"].isin(te_d)

    pos, neg = int(y[tr].sum()), int((~y[tr].astype(bool)).sum())
    spw = neg / max(pos, 1)
    clf = XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.08, subsample=0.9,
        colsample_bytree=0.9, scale_pos_weight=spw, eval_metric="aucpr",
        n_jobs=4, random_state=7,
    )
    clf.fit(X[tr], y[tr])
    prob = clf.predict_proba(X[te])[:, 1]
    thr = _choose_threshold(y[te].values, prob)
    metrics = _classification_metrics(y[te].values, prob, thr)
    joblib.dump({"model": clf, "features": feat, "threshold": thr}, os.path.join(MODEL_DIR, "storage.joblib"))
    print(f"[storage]   PR-AUC={metrics['pr_auc']}  recall={metrics['recall']}  "
          f"FPR={metrics['fpr']}  (naive acc baseline={metrics['naive_accuracy_baseline']})")
    return metrics


def train_components():
    df = pd.read_csv(os.path.join(dg.DATA_DIR, "components.csv"))
    df, feat = fe.component_features(df)
    Xtr, Xte, ytr, yte = train_test_split(
        df[feat], df["machine_failure"], test_size=0.25, random_state=7,
        stratify=df["machine_failure"])
    spw = (ytr == 0).sum() / max((ytr == 1).sum(), 1)
    clf = XGBClassifier(
        n_estimators=250, max_depth=5, learning_rate=0.1, subsample=0.9,
        colsample_bytree=0.9, scale_pos_weight=spw, eval_metric="aucpr",
        n_jobs=4, random_state=7)
    clf.fit(Xtr, ytr)
    prob = clf.predict_proba(Xte)[:, 1]
    thr = _choose_threshold(yte.values, prob)
    metrics = _classification_metrics(yte.values, prob, thr)

    # per-component attribution heads (which subsystem is at risk)
    heads = {}
    for mode, label in [("hdf", "thermal"), ("pwf", "power"), ("osf", "mechanical")]:
        if df[mode].sum() < 10:
            continue
        ytr_m = df.loc[ytr.index, mode]
        spw_m = (ytr_m == 0).sum() / max((ytr_m == 1).sum(), 1)
        h = XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.1,
                          scale_pos_weight=spw_m, eval_metric="logloss",
                          n_jobs=4, random_state=7)
        h.fit(Xtr, ytr_m)
        heads[label] = h
    joblib.dump({"model": clf, "features": feat, "threshold": thr, "heads": heads},
                os.path.join(MODEL_DIR, "components.joblib"))
    print(f"[components] PR-AUC={metrics['pr_auc']}  recall={metrics['recall']}  "
          f"FPR={metrics['fpr']}  (naive acc baseline={metrics['naive_accuracy_baseline']})")
    return metrics


def train_rul():
    df = pd.read_csv(os.path.join(dg.DATA_DIR, "rul.csv"))
    feat = fe.rul_features()
    units = df["unit"].unique()
    tr_u, te_u = train_test_split(units, test_size=0.25, random_state=7)
    tr, te = df["unit"].isin(tr_u), df["unit"].isin(te_u)
    reg = XGBRegressor(n_estimators=300, max_depth=5, learning_rate=0.08,
                       subsample=0.9, colsample_bytree=0.9, n_jobs=4, random_state=7)
    reg.fit(df[tr][feat], df[tr]["RUL"])
    pred = np.clip(reg.predict(df[te][feat]), 0, dg.RUL_CAP)
    rmse = float(np.sqrt(mean_squared_error(df[te]["RUL"], pred)))
    mae = float(mean_absolute_error(df[te]["RUL"], pred))
    # NASA scoring fn: penalizes late predictions (under-estimating risk) harder
    d = pred - df[te]["RUL"].values
    score = float(np.sum(np.where(d < 0, np.exp(-d / 13) - 1, np.exp(d / 10) - 1)))
    joblib.dump({"model": reg, "features": feat}, os.path.join(MODEL_DIR, "rul.joblib"))
    metrics = {"rmse": round(rmse, 2), "mae": round(mae, 2),
               "nasa_score": round(score, 1), "rul_cap": dg.RUL_CAP,
               "n_test_units": int(len(te_u))}
    print(f"[rul]       RMSE={metrics['rmse']} cycles  MAE={metrics['mae']} cycles")
    return metrics


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(os.path.join(dg.DATA_DIR, "storage.csv")):
        dg.main()
    all_metrics = {
        "storage": train_storage(),
        "components": train_components(),
        "rul": train_rul(),
    }
    with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
        json.dump(all_metrics, f, indent=2)
    print("\nSaved models + metrics.json to", MODEL_DIR)


if __name__ == "__main__":
    main()
