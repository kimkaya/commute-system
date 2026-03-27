# Face-API.js Models

This directory should contain the face-api.js model files for face recognition.

## Required Models

Download the following models from the [face-api.js repository](https://github.com/justadudewhohacks/face-api.js-models):

1. **tiny_face_detector_model-weights_manifest.json** and weights
2. **face_landmark_68_model-weights_manifest.json** and weights
3. **face_recognition_model-weights_manifest.json** and weights
4. **face_expression_model-weights_manifest.json** and weights

## Directory Structure

```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
├── face_recognition_model-shard2
├── face_expression_model-weights_manifest.json
├── face_expression_model-shard1
└── README.md (this file)
```

## Installation

1. Clone the face-api.js-models repository:
   ```bash
   git clone https://github.com/justadudewhohacks/face-api.js-models.git
   ```

2. Copy the required model files to this directory:
   ```bash
   cp face-api.js-models/tiny_face_detector/* public/models/
   cp face-api.js-models/face_landmark_68/* public/models/
   cp face-api.js-models/face_recognition/* public/models/
   cp face-api.js-models/face_expression/* public/models/
   ```

## Usage

The models are automatically loaded by the application when face recognition features are used. The loading is handled in `lib/face-api.ts`.

## Notes

- Model files are required for face recognition to work
- Total size: ~6MB
- Models are loaded once and cached in memory
- Consider using CDN for production deployment
