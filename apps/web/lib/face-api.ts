import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadFaceApiModels() {
  if (modelsLoaded) return;
  
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face-api.js models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw error;
  }
}

export async function detectFace(imageElement: HTMLImageElement | HTMLVideoElement) {
  try {
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection;
  } catch (error) {
    console.error('Error detecting face:', error);
    return null;
  }
}

export async function compareFaces(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): Promise<number> {
  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);
  
  return faceapi.euclideanDistance(d1, d2);
}

export function isFaceMatch(distance: number, threshold = 0.6): boolean {
  return distance < threshold;
}

export async function detectAllFaces(imageElement: HTMLImageElement | HTMLVideoElement) {
  try {
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    return detections;
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
}
