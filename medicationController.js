const Medication = require('../models/medicationModel');
const Patient = require('../models/patientModel');
const ApiError = require('../utils/apiError');

/**
 * Medication Controller
 * Handles medication-related operations for the AI Diagnostic and Prescription system
 */

// Get all medications with pagination and filtering
exports.getAllMedications = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by name
    if (req.query.name) {
      query.$or = [
        { name: { $regex: req.query.name, $options: 'i' } },
        { genericName: { $regex: req.query.name, $options: 'i' } },
        { brandNames: { $regex: req.query.name, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (req.query.category) {
      query.category = { $regex: req.query.category, $options: 'i' };
    }
    
    // Filter by drug class
    if (req.query.drugClass) {
      query.drugClass = { $regex: req.query.drugClass, $options: 'i' };
    }
    
    // Filter by active ingredient
    if (req.query.activeIngredient) {
      query['activeIngredients.name'] = { $regex: req.query.activeIngredient, $options: 'i' };
    }
    
    // Filter by dosage form
    if (req.query.dosageForm) {
      query.dosageForm = req.query.dosageForm;
    }
    
    // Filter by route
    if (req.query.route) {
      query.route = req.query.route;
    }
    
    // Filter by controlled substance schedule
    if (req.query.controlledSubstanceSchedule) {
      query.controlledSubstanceSchedule = req.query.controlledSubstanceSchedule;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const medications = await Medication.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalMedications = await Medication.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: medications.length,
      pagination: {
        total: totalMedications,
        page,
        limit,
        pages: Math.ceil(totalMedications / limit)
      },
      data: {
        medications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single medication by ID
exports.getMedication = async (req, res, next) => {
  try {
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return next(new ApiError('No medication found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        medication
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new medication
exports.createMedication = async (req, res, next) => {
  try {
    // Check if medication with same name already exists
    const existingMedication = await Medication.findOne({ name: req.body.name });
    
    if (existingMedication) {
      return next(new ApiError('Medication with this name already exists', 400));
    }
    
    // Add audit information
    req.body.createdBy = req.user ? req.user.id : undefined;
    
    const newMedication = await Medication.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        medication: newMedication
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a medication
exports.updateMedication = async (req, res, next) => {
  try {
    // Add audit information
    req.body.updatedBy = req.user ? req.user.id : undefined;
    req.body.updatedAt = new Date();
    
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!medication) {
      return next(new ApiError('No medication found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        medication
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a medication
exports.deleteMedication = async (req, res, next) => {
  try {
    const medication = await Medication.findByIdAndDelete(req.params.id);
    
    if (!medication) {
      return next(new ApiError('No medication found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Recommend medications based on diagnosis and patient information
exports.recommendMedications = async (req, res, next) => {
  try {
    const { diagnosisId, patientId } = req.body;
    
    if (!diagnosisId || !patientId) {
      return next(new ApiError('Diagnosis ID and Patient ID are required', 400));
    }
    
    // This would normally call the AI/ML service
    // For now, we'll return a mock response
    
    // Mock AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock recommended medications
    const recommendedMedications = [
      {
        medicationId: '60d21b4667d0d8992e610c85',
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Every 8 hours',
        duration: '7 days',
        route: 'Oral',
        aiConfidence: 0.92,
        reasonForRecommendation: 'First-line antibiotic for bacterial infections',
        potentialInteractions: [],
        contraindications: ['Penicillin allergy']
      },
      {
        medicationId: '60d21b4667d0d8992e610c86',
        name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'Every 6 hours as needed',
        duration: 'Up to 5 days',
        route: 'Oral',
        aiConfidence: 0.88,
        reasonForRecommendation: 'For pain and inflammation',
        potentialInteractions: ['Blood thinners', 'Certain antihypertensives'],
        contraindications: ['Peptic ulcer disease', 'Severe renal impairment']
      },
      {
        medicationId: '60d21b4667d0d8992e610c87',
        name: 'Loratadine',
        dosage: '10mg',
        frequency: 'Once daily',
        duration: 'As needed',
        route: 'Oral',
        aiConfidence: 0.75,
        reasonForRecommendation: 'For allergic symptoms',
        potentialInteractions: ['CYP3A4 inhibitors'],
        contraindications: []
      }
    ];
    
    res.status(200).json({
      status: 'success',
      data: {
        diagnosisId,
        patientId,
        recommendedMedications,
        recommendationId: `rec_${Date.now()}`,
        timestamp: new Date(),
        aiVersion: '1.0.0',
        processingTime: 0.65 // seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new prescription
exports.createPrescription = async (req, res, next) => {
  try {
    const { patientId, medications, diagnosis, notes } = req.body;
    
    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return next(new ApiError('Patient ID and at least one medication are required', 400));
    }
    
    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Add prescriber information
    const prescriber = req.user ? {
      id: req.user.id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      role: req.user.role,
      licenseNumber: req.user.licenseNumber
    } : {
      name: 'AI Assistant',
      role: 'ai_system'
    };
    
    // Create prescription object
    const prescription = {
      patient: patientId,
      medications: medications.map(med => ({
        medication: med.medicationId,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        route: med.route,
        instructions: med.instructions,
        quantity: med.quantity,
        refills: med.refills || 0
      })),
      diagnosis: diagnosis,
      prescriber,
      notes,
      status: 'pending',
      createdAt: new Date(),
      prescriptionId: `RX${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    };
    
    // In a real implementation, this would be saved to a Prescription model
    // For now, we'll just return the prescription object
    
    res.status(201).json({
      status: 'success',
      data: {
        prescription
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a prescription by ID
exports.getPrescription = async (req, res, next) => {
  try {
    // In a real implementation, this would query the Prescription model
    // For now, we'll return a mock prescription
    
    const prescription = {
      id: req.params.id,
      prescriptionId: 'RX20230001ABC',
      patient: {
        id: '60d21b4667d0d8992e610c88',
        name: 'John Doe',
        dateOfBirth: '1980-05-15'
      },
      medications: [
        {
          medication: '60d21b4667d0d8992e610c85',
          name: 'Amoxicillin',
          dosage: '500mg',
          frequency: 'Every 8 hours',
          duration: '7 days',
          route: 'Oral',
          instructions: 'Take with food',
          quantity: 21,
          refills: 0
        }
      ],
      diagnosis: 'Acute bacterial sinusitis',
      prescriber: {
        id: '60d21b4667d0d8992e610c89',
        name: 'Dr. Jane Smith',
        role: 'doctor',
        licenseNumber: 'MD12345'
      },
      notes: 'Patient should complete full course of antibiotics',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date()
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        prescription
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get prescriptions by patient ID
exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // In a real implementation, this would query the Prescription model
    // For now, we'll return mock prescriptions
    
    const prescriptions = [
      {
        id: 'rx_001',
        prescriptionId: 'RX20230001ABC',
        medications: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'Every 8 hours',
            duration: '7 days'
          }
        ],
        diagnosis: 'Acute bacterial sinusitis',
        prescriber: 'Dr. Jane Smith',
        status: 'active',
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        id: 'rx_002',
        prescriptionId: 'RX20230002DEF',
        medications: [
          {
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            duration: '30 days'
          },
          {
            name: 'Hydrochlorothiazide',
            dosage: '12.5mg',
            frequency: 'Once daily',
            duration: '30 days'
          }
        ],
        diagnosis: 'Hypertension',
        prescriber: 'Dr. Jane Smith',
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 86400000) // 30 days ago
      },
      {
        id: 'rx_003',
        prescriptionId: 'RX20230003GHI',
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'Every 6 hours as needed',
            duration: '5 days'
          }
        ],
        diagnosis: 'Lower back pain',
        prescriber: 'Dr. Robert Johnson',
        status: 'completed',
        createdAt: new Date(Date.now() - 60 * 86400000) // 60 days ago
      }
    ];
    
    res.status(200).json({
      status: 'success',
      results: prescriptions.length,
      data: {
        patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        prescriptions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update prescription status
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return next(new ApiError('Status is required', 400));
    }
    
    // In a real implementation, this would update the Prescription model
    // For now, we'll return a mock response
    
    res.status(200).json({
      status: 'success',
      data: {
        prescriptionId: id,
        status,
        notes,
        updatedAt: new Date(),
        updatedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check for drug interactions
exports.checkDrugInteractions = async (req, res, next) => {
  try {
    const { medications, patientId } = req.body;
    
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return next(new ApiError('At least two medications are required', 400));
    }
    
    // This would normally call an external drug interaction API or the AI/ML service
    // For now, we'll return a mock response
    
    // Mock AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock interactions
    const interactions = [
      {
        medications: ['Lisinopril', 'Spironolactone'],
        severity: 'moderate',
        effect: 'Increased risk of hyperkalemia',
        recommendation: 'Monitor potassium levels closely'
      },
      {
        medications: ['Ibuprofen', 'Lisinopril'],
        severity: 'moderate',
        effect: 'Decreased antihypertensive efficacy',
        recommendation: 'Consider alternative pain reliever'
      },
      {
        medications: ['Warfarin', 'Ibuprofen'],
        severity: 'major',
        effect: 'Increased risk of bleeding',
        recommendation: 'Avoid combination if possible'
      }
    ];
    
    // Filter interactions based on provided medications
    const relevantInteractions = interactions.filter(interaction => {
      return interaction.medications.some(med => 
        medications.includes(med)
      );
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        medications,
        patientId,
        interactions: relevantInteractions,
        interactionCheckId: `int_${Date.now()}`,
        timestamp: new Date(),
        aiVersion: '1.0.0',
        processingTime: 0.45 // seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search medications by text
exports.searchMedications = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return next(new ApiError('Search query is required', 400));
    }
    
    const medications = await Medication.searchByText(query);
    
    res.status(200).json({
      status: 'success',
      results: medications.length,
      data: {
        medications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get medications by active ingredient
exports.getMedicationsByActiveIngredient = async (req, res, next) => {
  try {
    const { ingredient } = req.params;
    
    const medications = await Medication.findByActiveIngredient(ingredient);
    
    res.status(200).json({
      status: 'success',
      results: medications.length,
      data: {
        ingredient,
        medications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get medications by category
exports.getMedicationsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    const medications = await Medication.findByCategory(category);
    
    res.status(200).json({
      status: 'success',
      results: medications.length,
      data: {
        category,
        medications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get medications for a specific condition
exports.getMedicationsForCondition = async (req, res, next) => {
  try {
    const { condition } = req.params;
    
    const medications = await Medication.findForCondition(condition);
    
    res.status(200).json({
      status: 'success',
      results: medications.length,
      data: {
        condition,
        medications
      }
    });
  } catch (error) {
    next(error);
  }
};