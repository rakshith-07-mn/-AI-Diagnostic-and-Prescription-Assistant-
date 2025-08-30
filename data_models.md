# Data Models for AI Diagnostic and Prescription Assistant

This document defines the core data models for the AI Diagnostic and Prescription Assistant, including patient symptoms, diseases, and medications.

## 1. Patient Model

```json
{
  "patient_id": "string (UUID)",
  "demographics": {
    "age": "integer (years)",
    "weight": "float (kg)",
    "height": "float (cm)",
    "sex": "string (enum: 'male', 'female', 'other')",
    "ethnicity": "string (optional)"
  },
  "medical_history": {
    "allergies": ["string (medication or substance name)"],
    "chronic_conditions": ["string (disease name)"],
    "current_medications": [
      {
        "medication_id": "string (reference to Medication)",
        "dosage": "string",
        "frequency": "string",
        "start_date": "date"
      }
    ],
    "past_surgeries": ["string (optional)"],
    "family_history": ["string (optional)"]
  },
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## 2. Symptom Model

```json
{
  "symptom_id": "string (UUID)",
  "name": "string",
  "description": "string",
  "body_system": "string (e.g., 'respiratory', 'cardiovascular')",
  "synonyms": ["string"],
  "common_descriptions": ["string (lay terms used by patients)"],
  "severity_scale": {
    "type": "string (enum: 'numeric', 'categorical')",
    "values": ["string or integer"]
  },
  "related_symptoms": ["string (symptom_id references)"],
  "metadata": {
    "icd_10_code": "string (optional)",
    "snomed_ct_code": "string (optional)"
  }
}
```

## 3. Patient Symptom Report Model

```json
{
  "report_id": "string (UUID)",
  "patient_id": "string (reference to Patient)",
  "timestamp": "datetime",
  "symptoms": [
    {
      "symptom_id": "string (reference to Symptom)",
      "severity": "integer or string (based on symptom's severity_scale)",
      "duration": {
        "value": "integer",
        "unit": "string (enum: 'hours', 'days', 'weeks', 'months', 'years')"
      },
      "characteristics": ["string (e.g., 'sharp', 'dull', 'intermittent')"],
      "location": "string (body part or region)",
      "factors": {
        "aggravating": ["string"],
        "alleviating": ["string"]
      },
      "free_text_description": "string (patient's own words)"
    }
  ],
  "input_type": "string (enum: 'structured', 'unstructured', 'mixed')",
  "original_text": "string (if input was unstructured)"
}
```

## 4. Disease Model

```json
{
  "disease_id": "string (UUID)",
  "name": "string",
  "description": "string",
  "category": "string (e.g., 'infectious', 'autoimmune', 'metabolic')",
  "symptoms": [
    {
      "symptom_id": "string (reference to Symptom)",
      "likelihood": "float (0-1)",
      "typical_severity": "integer or string",
      "typical_progression": "string",
      "diagnostic_weight": "float (importance for diagnosis)"
    }
  ],
  "risk_factors": ["string"],
  "complications": ["string"],
  "differential_diagnoses": ["string (disease_id references)"],
  "diagnostic_criteria": {
    "required_symptoms": ["string (symptom_id references)"],
    "minimum_symptom_count": "integer",
    "exclusion_criteria": ["string"]
  },
  "severity_levels": [
    {
      "level": "string (e.g., 'mild', 'moderate', 'severe')",
      "description": "string",
      "criteria": "string"
    }
  ],
  "metadata": {
    "icd_10_code": "string",
    "snomed_ct_code": "string (optional)",
    "medical_specialty": "string",
    "prevalence": "string or float",
    "requires_immediate_attention": "boolean"
  },
  "evidence_sources": [
    {
      "source_name": "string",
      "url": "string (optional)",
      "publication_date": "date (optional)",
      "confidence_level": "string (enum: 'high', 'medium', 'low')"
    }
  ]
}
```

## 5. Medication Model

```json
{
  "medication_id": "string (UUID)",
  "name": {
    "brand_names": ["string"],
    "generic_name": "string"
  },
  "drug_class": "string",
  "description": "string",
  "formulations": [
    {
      "form": "string (e.g., 'tablet', 'capsule', 'liquid')",
      "strength": "string (e.g., '10mg', '500mg')",
      "route": "string (enum: 'oral', 'topical', 'injection', etc.)"
    }
  ],
  "standard_dosages": [
    {
      "indication": "string (disease_id reference)",
      "population": "string (e.g., 'adult', 'pediatric', 'geriatric')",
      "min_weight": "float (kg, optional)",
      "max_weight": "float (kg, optional)",
      "min_age": "integer (years, optional)",
      "max_age": "integer (years, optional)",
      "dosage": {
        "amount": "string or float",
        "unit": "string",
        "frequency": "string",
        "duration": "string",
        "max_daily": "string or float",
        "special_instructions": "string"
      },
      "adjustments": [
        {
          "factor": "string (e.g., 'renal impairment', 'hepatic impairment')",
          "severity": "string",
          "modified_dosage": "string"
        }
      ]
    }
  ],
  "contraindications": [
    {
      "condition": "string",
      "severity": "string (enum: 'absolute', 'relative')",
      "description": "string"
    }
  ],
  "interactions": [
    {
      "interacts_with": "string (medication_id or substance)",
      "severity": "string (enum: 'minor', 'moderate', 'major')",
      "effect": "string",
      "recommendation": "string"
    }
  ],
  "side_effects": [
    {
      "effect": "string",
      "frequency": "string (e.g., 'common', 'rare')",
      "severity": "string",
      "onset": "string (e.g., 'immediate', 'delayed')",
      "action_required": "string"
    }
  ],
  "precautions": ["string"],
  "pregnancy_category": "string (enum: 'A', 'B', 'C', 'D', 'X')",
  "breastfeeding_compatible": "boolean or string",
  "monitoring_parameters": ["string"],
  "patient_instructions": ["string"],
  "regulatory_status": {
    "fda_approved": "boolean",
    "approval_date": "date (optional)",
    "prescription_required": "boolean"
  },
  "evidence_sources": [
    {
      "source_name": "string",
      "url": "string (optional)",
      "publication_date": "date (optional)",
      "confidence_level": "string (enum: 'high', 'medium', 'low')"
    }
  ]
}
```

## 6. Diagnostic Result Model

```json
{
  "diagnostic_id": "string (UUID)",
  "patient_id": "string (reference to Patient)",
  "symptom_report_id": "string (reference to PatientSymptomReport)",
  "timestamp": "datetime",
  "predicted_diseases": [
    {
      "disease_id": "string (reference to Disease)",
      "confidence_score": "float (0-1)",
      "supporting_symptoms": [
        {
          "symptom_id": "string",
          "contribution_weight": "float"
        }
      ],
      "missing_symptoms": ["string (symptom_id references)"],
      "predicted_severity": "string",
      "recommendation_type": "string (enum: 'self_care', 'non_urgent', 'urgent', 'emergency')"
    }
  ],
  "medication_recommendations": [
    {
      "disease_id": "string (reference to Disease)",
      "medications": [
        {
          "medication_id": "string (reference to Medication)",
          "rationale": "string",
          "confidence_score": "float (0-1)",
          "is_first_line": "boolean",
          "dosage": {
            "amount": "string or float",
            "unit": "string",
            "frequency": "string",
            "duration": "string",
            "special_instructions": "string"
          },
          "contraindication_check": {
            "passed": "boolean",
            "warnings": ["string"]
          },
          "interaction_check": {
            "passed": "boolean",
            "warnings": ["string"]
          }
        }
      ],
      "non_pharmacological_recommendations": ["string"]
    }
  ],
  "safety_alerts": [
    {
      "alert_type": "string (enum: 'warning', 'critical')",
      "message": "string",
      "recommendation": "string"
    }
  ],
  "explanation": {
    "summary": "string",
    "detailed_reasoning": "string",
    "evidence_sources": ["string"]
  },
  "requires_human_review": "boolean",
  "review_reason": "string (optional)"
}
```

## 7. Feedback Model

```json
{
  "feedback_id": "string (UUID)",
  "diagnostic_id": "string (reference to DiagnosticResult)",
  "provider_id": "string (optional, if feedback from healthcare provider)",
  "timestamp": "datetime",
  "diagnostic_accuracy": {
    "rating": "integer (1-5)",
    "correct_disease": "string (disease_id, optional)",
    "comments": "string"
  },
  "medication_recommendation_accuracy": {
    "rating": "integer (1-5)",
    "correct_medications": ["string (medication_id references)"],
    "comments": "string"
  },
  "dosage_accuracy": {
    "rating": "integer (1-5)",
    "correct_dosages": [
      {
        "medication_id": "string",
        "correct_dosage": "string"
      }
    ],
    "comments": "string"
  },
  "overall_usefulness": "integer (1-5)",
  "additional_comments": "string",
  "verified_by": "string (optional, healthcare provider ID)"
}
```

## 8. Audit Log Model

```json
{
  "log_id": "string (UUID)",
  "timestamp": "datetime",
  "action_type": "string (enum: 'symptom_input', 'diagnosis', 'recommendation', 'feedback', etc.)",
  "user_id": "string (patient_id or provider_id)",
  "user_type": "string (enum: 'patient', 'provider', 'system')",
  "resource_type": "string (e.g., 'PatientSymptomReport', 'DiagnosticResult')",
  "resource_id": "string",
  "description": "string",
  "ip_address": "string (optional)",
  "system_version": "string"
}
```

## Relationships Between Models

1. **Patient** → **PatientSymptomReport**: One-to-many (a patient can have multiple symptom reports)
2. **Symptom** → **PatientSymptomReport**: Many-to-many (a report contains multiple symptoms, and symptoms appear in multiple reports)
3. **PatientSymptomReport** → **DiagnosticResult**: One-to-one (each symptom report generates one diagnostic result)
4. **Disease** → **DiagnosticResult**: Many-to-many (a diagnostic result can predict multiple diseases, and diseases appear in multiple diagnostic results)
5. **Disease** → **Medication**: Many-to-many (a disease can be treated by multiple medications, and medications can treat multiple diseases)
6. **DiagnosticResult** → **Feedback**: One-to-many (a diagnostic result can receive multiple feedback entries)
7. **All Models** → **AuditLog**: One-to-many (all actions on any model are logged)

## Data Validation Rules

1. **Patient**:
   - Age must be non-negative
   - Weight and height must be positive values

2. **Symptom**:
   - Name and description are required
   - Severity scale must have at least two values

3. **PatientSymptomReport**:
   - Must contain at least one symptom
   - Timestamp cannot be in the future

4. **Disease**:
   - Must have at least one associated symptom
   - Confidence scores must be between 0 and 1

5. **Medication**:
   - Must have at least one formulation
   - Must have at least one standard dosage

6. **DiagnosticResult**:
   - Must have at least one predicted disease
   - Confidence scores must be between 0 and 1

7. **Feedback**:
   - Ratings must be between 1 and 5

## Data Security Considerations

1. **Patient Data**:
   - All personally identifiable information must be encrypted at rest and in transit
   - Access to patient data must be logged and restricted based on role

2. **Diagnostic Results**:
   - Must be associated with access controls
   - Retention policies must comply with healthcare regulations

3. **Audit Logs**:
   - Must be immutable and tamper-evident
   - Must be retained according to regulatory requirements

## Data Integration Points

1. **External Medical Knowledge Bases**:
   - Disease and medication data should be regularly updated from authoritative sources
   - Standardized codes (ICD-10, SNOMED CT) facilitate integration

2. **Electronic Health Records (EHR)**:
   - Patient model should be compatible with FHIR or HL7 standards
   - Diagnostic results should be exportable in standard formats

3. **Pharmacological Databases**:
   - Medication data should integrate with drug interaction checkers
   - Dosage information should be validated against pharmaceutical references