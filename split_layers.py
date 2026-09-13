import os
import cv2
import numpy as np

def split_layers(input_path, fg_out, bg_out):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None: return

    # Ensure it's 4 channels (BGRA)
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    # Grayscale for thresholding
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    
    # We assume the background is dark (mostly black/stars) and the shape is brighter.
    # We use a threshold to separate them.
    _, thresh = cv2.threshold(img_gray, 15, 255, cv2.THRESH_BINARY)
    
    # Find contours to isolate the main shape and ignore small background stars
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    clean_mask = np.zeros_like(img_gray)
    if contours:
        # Sort contours by area and keep the largest ones (in case it's disjoint)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        # Draw the largest contour (the shape)
        cv2.drawContours(clean_mask, [contours[0]], -1, 255, -1)
    
    # Soften mask for a smooth foreground alpha edge
    fg_mask = cv2.GaussianBlur(clean_mask, (7, 7), 0)
    
    # Create foreground image (BGR + Alpha mask)
    fg_img = img.copy()
    fg_img[:, :, 3] = fg_mask
    
    # Create background image using true inpainting!
    # Dilate the mask heavily to make sure we erase the entire anti-aliased edge of the shape
    kernel = np.ones((15, 15), np.uint8)
    inpaint_mask = cv2.dilate(clean_mask, kernel, iterations=1)
    
    bg_bgr = img[:, :, :3]
    # Telea inpainting algorithm fills the hole seamlessly using the surrounding background pattern
    bg_inpainted = cv2.inpaint(bg_bgr, inpaint_mask, 10, cv2.INPAINT_TELEA)
    
    # Convert inpainted bg back to BGRA
    bg_img = cv2.cvtColor(bg_inpainted, cv2.COLOR_BGR2BGRA)
    
    cv2.imwrite(fg_out, fg_img)
    cv2.imwrite(bg_out, bg_img)
    print("OpenCV Layer separation complete.")

if __name__ == "__main__":
    split_layers(
        "assets/background.png", 
        "assets/fg_layer.png", 
        "assets/bg_layer.png"
    )
