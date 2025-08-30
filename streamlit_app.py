import sys
import os
import json
import streamlit as st
from typing import List, Dict

# ---- Setup paths ----
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SRC_DIR = os.path.join(BASE_DIR, "ai_clinical_assistant", "src")
sys.path.append(SRC_DIR)

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(BASE_DIR, 'ai_clinical_assistant')))

# Import modules
from ai_clinical_assistant.src.model.inference import Predictor
from ai_clinical_assistant.src.safety import detect_red_flags, allergy_filter

# ---- Streamlit configuration ----
st.set_page_config(page_title="AI Diagnostic & Rx Assistant — Demo", layout="centered")
st.title("🩺 AI Diagnostic & Rx Assistant — Demo")
st.caption("Educational prototype. Not medical advice.")

with st.expander("Safety & Privacy Notice", expanded=False):
    st.markdown(
        "- This demo does not store or send your data to external servers.\n"
        "- Medication and dosing data are placeholders. Replace with guideline-backed values before any real use.\n"
        "- Critical symptoms trigger a *refer to provider* notice and suppress medication suggestions."
    )

# ---- Input Section ----
symptoms = st.text_area("Describe symptoms", placeholder="e.g., burning during urination and frequent urge to pee", height=150)

colA, colB, colC = st.columns(3)
with colA:
    age = st.number_input("Age (years)", min_value=0, max_value=120, value=30, step=1)
with colB:
    weight = st.number_input("Weight (kg)", min_value=0.0, max_value=300.0, value=70.0, step=0.5)
with colC:
    allergies = st.text_input("Allergies (comma-separated)", placeholder="e.g., penicillin, ibuprofen")

refer_reasons = detect_red_flags(symptoms) if symptoms else []

# ---- Analysis Button ----
if st.button("Analyze"):
    if not symptoms.strip():
        st.warning("Please enter symptoms.")
        st.stop()

    if refer_reasons:
        st.error(f"⚠️ Critical symptoms detected: **{', '.join(refer_reasons)}**. Seek medical care. "
                 "Medication suggestions are disabled.")
    try:
        predictor = Predictor()
    except FileNotFoundError as e:
        st.error(str(e))
        st.info("Run: `python ai_clinical_assistant/src/model/train.py` first.")
        st.stop()

    # ---- Predictions ----
    ranked = predictor.predict(symptoms, top_k=3)
    st.subheader("Most likely conditions")
    for disease, score in ranked:
        st.markdown(f"- **{disease.replace('_',' ').title()}** — confidence: `{score:.2f}`")

    st.divider()
    st.subheader("Explainability (matched keywords)")
    kws = predictor.explanation_keywords(symptoms)
    st.markdown(", ".join(f"`{k}`" for k in kws) if kws else "_No keyword matches found in the demo knowledge base._")

    st.divider()
    st.subheader("Medication support (demo placeholders)")
    if refer_reasons:
        st.info("Suppressed due to red flags.")
    else:
        for disease, score in ranked:
            st.markdown(f"**{disease.replace('_',' ').title()}**")
            meds = predictor.meds_for_disease(disease)
            meds = allergy_filter(meds, allergies)
            if not meds:
                st.write("_No entries for this condition in the demo knowledge base._")
                continue

            for med in meds:
                name = med.get("name", "Unknown")
                dose = med.get("dose", {})
                notes = med.get("notes", "")
                computed = predictor.compute_dose(dose, weight)

                demo_only = True if dose is None else dose.get("demo_only", True)
                allergy_flag = med.get("allergy_flag", False)

                cols = st.columns([3, 2, 2, 2])
                cols[0].markdown(f"- **{name}**" + ("  🚫 *check allergy*" if allergy_flag else ""))
                cols[1].markdown(f"Class: `{med.get('class', '-')}`")
                if demo_only or computed is None:
                    cols[2].markdown("Dose: _demo placeholder_")
                    cols[3].markdown("Freq/Duration: _demo placeholder_")
                else:
                    cols[2].markdown(f"Dose: **{computed.get('dose_mg', '-')} mg**")
                    cols[3].markdown(f"{computed.get('frequency', '-')} / {computed.get('duration_days', '-')} days")

                if notes:
                    st.caption(notes)

    # ---- Feedback Section ----
    st.divider()
    st.subheader("Feedback")
    fb_col1, fb_col2 = st.columns([3, 1])
    with fb_col1:
        feedback_text = st.text_input("Was this helpful? Suggest corrections or add details.")
    with fb_col2:
        submit_fb = st.button("Submit feedback")

    if submit_fb and feedback_text.strip():
        fb_path = os.path.join(BASE_DIR, "feedback.csv")
        try:
            import pandas as pd
            from datetime import datetime
            row = {
                "timestamp": datetime.utcnow().isoformat(),
                "symptoms": symptoms,
                "age": age,
                "weight": weight,
                "allergies": allergies,
                "top_predictions": ";".join([f"{d}:{s:.2f}" for d, s in ranked]),
                "feedback": feedback_text.strip()
            }
            if os.path.exists(fb_path):
                df = pd.read_csv(fb_path)
                df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
            else:
                df = pd.DataFrame([row])
            df.to_csv(fb_path, index=False)
            st.success("Thanks! Feedback saved locally to feedback.csv")
        except Exception as e:
            st.error(f"Failed to save feedback: {e}")
