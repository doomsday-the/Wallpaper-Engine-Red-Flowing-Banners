import cv2
import numpy as np
from rembg import remove, new_session
from pymatting import estimate_alpha_knn
import time

def extract_perfect():
    print("Loading image...")
    img = cv2.imread("assets/background.png", cv2.IMREAD_UNCHANGED)
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    print("Running rembg (u2net) to get raw semantic mask...")
    with open("assets/background.png", "rb") as f:
        input_data = f.read()
        
    session = new_session("u2net")
    output_data = remove(
        input_data, 
        session=session,
        alpha_matting=False,
        post_process_mask=True
    )
    
    # Load rembg output
    nparr = np.frombuffer(output_data, np.uint8)
    rembg_img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    raw_mask = rembg_img[:, :, 3]
    
    print("Getting rid of all pixels not at 100% opacity from raw mask...")
    raw_mask[raw_mask < 255] = 0
    
    print("Smoothing the raw mask to remove upscale jaggedness...")
    # Heavy blur to melt the 8x8 blocky edges from u2net upscaling
    blurred_mask = cv2.GaussianBlur(raw_mask, (21, 21), 0)
    _, smooth_mask = cv2.threshold(blurred_mask, 127, 255, cv2.THRESH_BINARY)
    
    print("Generating trimap for high-res alpha matting...")
    kernel = np.ones((11, 11), np.uint8)
    eroded = cv2.erode(smooth_mask, kernel, iterations=1)
    dilated = cv2.dilate(smooth_mask, kernel, iterations=1)
    
    trimap = np.zeros_like(raw_mask)
    trimap[dilated == 255] = 128
    trimap[eroded == 255] = 255
    
    print("Running true alpha matting with pymatting (KNN)...")
    start_time = time.time()
    img_float = img[:, :, :3].astype(np.float64) / 255.0
    trimap_float = trimap.astype(np.float64) / 255.0
    
    alpha = estimate_alpha_knn(img_float, trimap_float)
    print(f"Matting completed in {time.time() - start_time:.2f} seconds.")
    
    alpha_uint8 = (alpha * 255).astype(np.uint8)
    
    # Clean up alpha slightly to remove noise
    alpha_uint8[alpha_uint8 < 5] = 0
    alpha_uint8[alpha_uint8 > 250] = 255
    
    result = img.copy()
    result[:, :, 3] = alpha_uint8
    
    cv2.imwrite("assets/sculpture.png", result)
    print("Saved perfectly matted image to assets/sculpture.png!")

if __name__ == "__main__":
    extract_perfect()
