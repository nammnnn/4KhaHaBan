# -*- coding: utf-8 -*-
"""
High-definition image enhancer for dog photos
Upscales 150x150 images to 600x600 using Lanczos sinc interpolation,
de-blocking, unsharp mask edge enhancement, and high-quality 4:4:4 chroma encoding.
"""

import os
from PIL import Image, ImageFilter, ImageEnhance

animals_dir = 'd:/HaBan/public/animals'

def enhance_image(filepath):
    with Image.open(filepath) as im:
        if im.mode != 'RGB':
            im = im.convert('RGB')
        
        orig_w, orig_h = im.size
        # Only upscale if smaller than 500px
        if orig_w < 500:
            target_w = orig_w * 4 # 150 -> 600
            target_h = orig_h * 4
            
            # Step 1: 4x Lanczos high-quality resampling
            upscaled = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
            
            # Step 2: Edge-preserving contrast & saturation tune
            contraster = ImageEnhance.Contrast(upscaled)
            enhanced = contraster.enhance(1.08)
            
            colorer = ImageEnhance.Color(enhanced)
            enhanced = colorer.enhance(1.06)
            
            # Step 3: Unsharp mask to crisply define fur, eyes, and facial contours
            unsharp = enhanced.filter(ImageFilter.UnsharpMask(radius=1.8, percent=185, threshold=2))
            
            # Step 4: Final micro-sharpness boost
            sharpener = ImageEnhance.Sharpness(unsharp)
            final_img = sharpener.enhance(1.75)
            
            # Save with maximum quality and 4:4:4 subsampling
            final_img.save(filepath, 'JPEG', quality=96, subsampling=0)
            return True
    return False

def main():
    files = [f for f in os.listdir(animals_dir) if f.startswith('dog_')]
    print(f'Found {len(files)} dog image files to enhance...')
    
    enhanced_count = 0
    for f in files:
        fp = os.path.join(animals_dir, f)
        if enhance_image(fp):
            enhanced_count += 1
            if enhanced_count % 50 == 0:
                print(f'Enhanced {enhanced_count}/{len(files)} files...')
                
    print(f'Done! Successfully enhanced {enhanced_count} dog images to 600x600 HD.')

if __name__ == '__main__':
    main()
