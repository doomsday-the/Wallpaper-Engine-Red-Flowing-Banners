import cv2
import numpy as np

def refine_mask(input_path, output_path):
    print(f"Loading {input_path}...")
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    
    if img is None or img.shape[2] != 4:
        print("Image must be BGRA")
        return

    alpha = img[:, :, 3]
    bgr = img[:, :, :3]

    print("Smoothing jagged edges...")
    # Step 1: Heavy blur to smooth out the jagged steps
    blurred = cv2.GaussianBlur(alpha, (11, 11), 0)
    
    # Step 2: Threshold to get a crisp, but now smooth, continuous boundary
    _, smooth_mask = cv2.threshold(blurred, 127, 255, cv2.THRESH_BINARY)
    
    # Step 3: Anti-aliasing with a small blur
    final_alpha = cv2.GaussianBlur(smooth_mask, (5, 5), 0)
    
    # Re-apply to image
    img_out = np.dstack((bgr, final_alpha))
    
    # Pre-multiply alpha so edges don't show background color fringing?
    # Actually, we should just use the original image's pixels and the new alpha
    # But since the previous image was already extracted, the pixels outside the alpha might be black or transparent.
    # It's better to load the ORIGINAL background.png and apply the final_alpha to it!
    
    original = cv2.imread("assets/background.png", cv2.IMREAD_UNCHANGED)
    if original.shape[2] == 3:
        original = cv2.cvtColor(original, cv2.COLOR_BGR2BGRA)
        
    final_img = original.copy()
    final_img[:, :, 3] = final_alpha
    
    cv2.imwrite(output_path, final_img)
    print(f"Saved refined image to {output_path}")

if __name__ == "__main__":
    refine_mask("assets/sculpture.png", "assets/sculpture.png")
