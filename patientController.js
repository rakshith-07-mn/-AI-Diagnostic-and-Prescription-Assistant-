const Patient = require('../models/patientModel');
const ApiError = require('../utils/apiError');

/**
 * Patient Controller
 * Handles patient-related operations for the AI Diagnostic and Prescription system
 */

// Get all patients with pagination
exports.getAllPatients = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by name
    if (req.query.name) {
      query.$or = [
        { firstName: { $regex: req.query.name, $options: 'i' } },
        { lastName: { $regex: req.query.name, $options: 'i' } }
      ];
    }
    
    // Filter by age range
    if (req.query.minAge || req.query.maxAge) {
      query.dateOfBirth = {};
      
      if (req.query.minAge) {
        const minBirthDate = new Date();
        minBirthDate.setFullYear(minBirthDate.getFullYear() - parseInt(req.query.minAge));
        query.dateOfBirth.$lte = minBirthDate;
      }
      
      if (req.query.maxAge) {
        const maxBirthDate = new Date();
        maxBirthDate.setFullYear(maxBirthDate.getFullYear() - parseInt(req.query.maxAge));
        query.dateOfBirth.$gte = maxBirthDate;
      }
    }
    
    // Filter by gender
    if (req.query.gender) {
      query.gender = req.query.gender;
    }
    
    // Filter by medical condition
    if (req.query.condition) {
      query['medicalHistory.conditions.name'] = { $regex: req.query.condition, $options: 'i' };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const patients = await Patient.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPatients = await Patient.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: patients.length,
      pagination: {
        total: totalPatients,
        page,
        limit,
        pages: Math.ceil(totalPatients / limit)
      },
      data: {
        patients
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single patient by ID
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        patient
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new patient
exports.createPatient = async (req, res, next) => {
  try {
    // Check if patient with same identifier already exists
    if (req.body.identifier) {
      const existingPatient = await Patient.findOne({
        'identifiers.value': req.body.identifier.value,
        'identifiers.type': req.body.identifier.type
      });
      
      if (existingPatient) {
        return next(new ApiError('Patient with this identifier already exists', 400));
      }
    }
    
    // Add user reference if available
    if (req.user) {
      req.body.user = req.user.id;
    }
    
    // Add audit information
    req.body.createdBy = req.user ? req.user.id : undefined;
    
    const newPatient = await Patient.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        patient: newPatient
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a patient
exports.updatePatient = async (req, res, next) => {
  try {
    // Add audit information
    req.body.updatedBy = req.user ? req.user.id : undefined;
    req.body.updatedAt = new Date();
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return the updated document
        runValidators: true // Run validators on update
      }
    );
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        patient
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a patient
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Get patient medical history
exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Extract medical history from patient
    const medicalHistory = {
      conditions: patient.medicalHistory.conditions || [],
      surgeries: patient.medicalHistory.surgeries || [],
      familyHistory: patient.medicalHistory.familyHistory || [],
      allergies: patient.medicalHistory.allergies || [],
      medications: patient.medicalHistory.medications || [],
      vitalSigns: patient.medicalHistory.vitalSigns || []
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        medicalHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add vital signs to patient
exports.addVitalSigns = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Add vital signs
    const vitalSign = {
      ...req.body,
      recordedBy: req.user ? req.user.id : undefined,
      recordedAt: new Date()
    };
    
    patient.medicalHistory.vitalSigns.push(vitalSign);
    await patient.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        vitalSign,
        patientId: patient._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add medication to patient
exports.addMedication = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Add medication
    const medication = {
      ...req.body,
      prescribedBy: req.user ? req.user.id : undefined,
      prescribedAt: new Date()
    };
    
    patient.medicalHistory.medications.push(medication);
    await patient.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        medication,
        patientId: patient._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add allergy to patient
exports.addAllergy = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Add allergy
    const allergy = {
      ...req.body,
      reportedBy: req.user ? req.user.id : undefined,
      reportedAt: new Date()
    };
    
    patient.medicalHistory.allergies.push(allergy);
    await patient.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        allergy,
        patientId: patient._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add medical condition to patient
exports.addMedicalCondition = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Add medical condition
    const condition = {
      ...req.body,
      diagnosedBy: req.user ? req.user.id : undefined,
      diagnosedAt: new Date()
    };
    
    patient.medicalHistory.conditions.push(condition);
    await patient.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        condition,
        patientId: patient._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get patients by age range
exports.getPatientsByAgeRange = async (req, res, next) => {
  try {
    const { minAge, maxAge } = req.query;
    
    if (!minAge && !maxAge) {
      return next(new ApiError('Please provide at least one age parameter', 400));
    }
    
    const patients = await Patient.findByAgeRange(minAge, maxAge);
    
    res.status(200).json({
      status: 'success',
      results: patients.length,
      data: {
        patients
      }
    });
  } catch (error) {
    next(error);
  }
};