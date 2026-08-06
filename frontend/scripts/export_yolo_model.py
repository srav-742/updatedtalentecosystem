import os
import shutil
from ultralytics import YOLO

# Manual export command:
# pip install ultralytics
# yolo export model=yolo11n.pt format=onnx imgsz=640 simplify=True opset=13
# Then copy the resulting yolo11n.onnx to frontend/public/models/yolo11n.onnx

def main():
    print("Downloading and loading YOLO11n model...")
    model = YOLO("yolo11n.pt")  # Downloads if not present

    print("Exporting model to ONNX format (imgsz=640, opset=13)...")
    # Export to onnx
    exported_path = model.export(format="onnx", imgsz=640, simplify=True, opset=13)

    print(f"Model exported to {exported_path}")

    # Move to frontend/public/models
    # Assuming this script is run from frontend/scripts/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.dirname(script_dir)
    target_dir = os.path.join(frontend_dir, "public", "models")
    
    os.makedirs(target_dir, exist_ok=True)
    
    target_path = os.path.join(target_dir, "yolo11n.onnx")
    
    print(f"Moving model to {target_path}...")
    shutil.move(exported_path, target_path)
    
    print("Export complete!")

if __name__ == "__main__":
    main()
