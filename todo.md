# PACS Viewer TODO

## Core Infrastructure
- [x] Install Cornerstone.js 3D and dependencies
- [x] Set up DICOM file upload functionality
- [x] Configure dark theme for medical imaging

## DICOM Viewer Core
- [x] Implement viewport component with Cornerstone.js
- [x] Add DICOM file parser and loader
- [x] Display DICOM images in viewport
- [ ] Show patient/study metadata

## Image Manipulation Tools
- [x] Window/Level (brightness/contrast) tool
- [x] Pan tool
- [x] Zoom tool
- [x] Rotation tool
- [x] Flip horizontal/vertical
- [ ] Scroll through series
- [x] Reset view tool

## Measurement Tools
- [x] Length measurement
- [x] Angle measurement
- [x] ROI (Region of Interest)
- [x] Ellipse measurement
- [x] Rectangle measurement

## Annotation Tools
- [x] Arrow annotation
- [ ] Text annotation
- [ ] Freehand draw

## Layout Features
- [x] Multi-viewport layout (1x1, 2x2, 3x3)
- [x] Series thumbnail navigation
- [ ] Viewport synchronization

## UI/UX
- [x] Tools wheel/toolbar interface
- [x] Dark professional theme
- [x] Responsive design
- [ ] Keyboard shortcuts
- [x] Tool activation indicators

## Advanced Features
- [ ] Cine mode (animated playback)
- [ ] Image inversion
- [ ] Export/save functionality
- [ ] Print functionality

## Testing
- [ ] Test with sample DICOM files
- [ ] Verify all tools work correctly
- [ ] Cross-browser testing

## Sample Data
- [x] Download sample DICOM files
- [x] Bundle sample files with application
- [x] Add "Load Sample" button to UI
- [x] Create sample data loader functionality

## Bug Fixes
- [x] Debug DICOM image display issue in browser
- [x] Fix Cornerstone rendering initialization
- [x] Verify image loading and viewport rendering

## UI Fixes
- [x] Fix button overlap in header
- [x] Improve header layout spacing

## New Pages & Features
- [x] Upgrade to server template with database support
- [x] Create Dashboard page for doctors
- [x] Create Patients list page
- [ ] Create Patient detail page
- [x] Create Studies/Cases list page
- [ ] Create Study detail page with viewer
- [x] Add navigation sidebar/header
- [ ] Create login/authentication page
- [ ] Add user profile management
- [ ] Implement patient search functionality
- [ ] Add study upload and management
- [ ] Create reports section
- [x] Add statistics and analytics to dashboard

## Missing Features to Add
- [ ] Fix 404 errors on sub-pages
- [ ] Create Add Patient form page
- [ ] Create Add Study/Case form page
- [ ] Create Patient Detail page
- [ ] Create Study Detail page with integrated DICOM viewer
- [ ] Make "View" buttons functional on dashboard
- [ ] Make "View Patients" button functional
- [ ] Make "View Studies" button functional
- [ ] Make "Add Patient" button functional

## Three-Role System Implementation - BATCH 1 IN PROGRESS
- [x] Update database schema with three roles (admin, doctor, patient)
- [x] Add doctor-patient relationship table
- [x] Add study sharing mechanism (many-to-many: studies can be shared with multiple doctors)
- [x] Implement role-based access control in backend
- [ ] Create separate dashboards for each role
- [ ] Add patient profile creation by doctors
- [ ] Add study upload with patient assignment
- [x] Implement study sharing workflow

## Doctor-Patient Data Access
- [ ] Doctors can see only their assigned patients
- [ ] Doctors can request access to other doctors' patients (with approval)
- [ ] Patients can share their studies with multiple doctors
- [ ] Study access log/audit trail

## Guest Upload Feature - BATCH 1 IN PROGRESS
- [x] Generate unique upload links for patients (no account needed)
- [x] Upload link associates DICOM with doctor and creates patient profile
- [x] Secure token-based upload system
- [x] Upload page for guests (no login required)

## DICOM Video/Cine Support - BATCH 1 IN PROGRESS
- [x] Add cine (video playback) controls for multi-frame DICOM
- [x] Playback speed adjustment (0.25x, 0.5x, 1x, 2x, 4x)
- [x] Frame-by-frame navigation
- [x] Loop playback toggle
- [x] Split-screen comparison (side-by-side viewer)

## Supported Modalities
- [ ] CT (Computed Tomography)
- [ ] MRI (Magnetic Resonance Imaging)
- [ ] XR/CR/DX (X-Ray, Digital Radiography)
- [ ] US (Ultrasound with cine support)
- [ ] MG (Mammography)
- [ ] PT (PET Scan)
- [ ] NM (Nuclear Medicine)

## EHR Integration
- [ ] HL7 message support (ADT, ORM, ORU messages)
- [ ] FHIR API endpoints (modern EHR standard)
- [ ] Receive imaging orders from EHR (ORM messages)
- [ ] Send radiology reports back to EHR (ORU messages)
- [ ] Patient demographic sync (ADT messages)
- [ ] DICOMweb WADO/QIDO/STOW support
- [ ] Webhook notifications for order status
- [ ] API keys/OAuth for EHR system authentication

## Workflow Integration
- [ ] Order management system (pending orders from EHR)
- [ ] Worklist for radiologists (unread studies)
- [ ] Report creation and approval workflow
- [ ] Automatic report sending to referring physician
- [ ] Study status tracking (ordered → acquired → read → reported)

## Bug Fixes - URGENT
- [x] Fix 404 error for DICOM viewer route
- [x] Fix 404 error for add patient page
- [x] Add missing routes to App.tsx

## Remaining Implementation - BATCH 2 IN PROGRESS
- [ ] Integrate Cornerstone.js with EnhancedDicomViewer component
- [x] Create AddPatient page with form
- [x] Create StudyDetail page with integrated viewer
- [ ] Create PatientDetail page
- [ ] Implement DICOM file upload with S3 storage
- [ ] Extract DICOM metadata and create database records
- [ ] Build role-specific dashboards (doctor, patient, admin)

## Theme Switcher
- [x] Enable switchable theme in App.tsx
- [x] Add theme toggle button to dashboard header
- [ ] Update light theme colors in index.css
