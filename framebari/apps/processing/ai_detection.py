# apps/processing/ai_detection.py
import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms
from transformers import DetrImageProcessor, DetrForObjectDetection

class AISubjectDetector:
    def __init__(self):
        # Load pre-trained DETR model for object detection
        self.processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
        self.model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
        
        # Load segmentation model (you might want to use a dedicated segmentation model)
        self.seg_model = self._load_segmentation_model()
    
    def _load_segmentation_model(self):
        """Load semantic segmentation model"""
        # This would load a proper segmentation model like DeepLabV3
        # For now, we'll use a placeholder
        return None
    
    def detect_objects(self, image):
        """Detect objects in image using DETR"""
        inputs = self.processor(images=image, return_tensors="pt")
        outputs = self.model(**inputs)
        
        # Post-process predictions
        target_sizes = torch.tensor([image.size[::-1]])
        results = self.processor.post_process_object_detection(
            outputs, target_sizes=target_sizes, threshold=0.5
        )[0]
        
        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            box = [round(i, 2) for i in box.tolist()]
            label_name = self.model.config.id2label[label.item()]
            
            detections.append({
                'label': label_name,
                'confidence': round(score.item(), 3),
                'bbox': {
                    'x': int(box[0]),
                    'y': int(box[1]),
                    'width': int(box[2] - box[0]),
                    'height': int(box[3] - box[1])
                }
            })
        
        return detections
    
    def segment_subjects(self, image):
        """Create detailed segmentation masks"""
        # Convert PIL to OpenCV
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Use GrabCut for better segmentation
        subjects = []
        
        # Detect faces first
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        for (x, y, w, h) in faces:
            mask = self._create_grabcut_mask(cv_image, (x, y, w, h))
            subjects.append({
                'type': 'person',
                'mask': mask,
                'bbox': {'x': x, 'y': y, 'width': w, 'height': h},
                'confidence': 0.9
            })
        
        return subjects
    
    def _create_grabcut_mask(self, image, bbox):
        """Create precise mask using GrabCut algorithm"""
        mask = np.zeros(image.shape[:2], np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        rect = bbox
        cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        return mask2 * 255
