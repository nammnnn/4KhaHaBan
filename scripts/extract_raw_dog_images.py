# -*- coding: utf-8 -*-
"""
Pure raw extractor for dog images from D:/Downloads/dog_list-1.pdf
Extracts the authentic, original binary JPEG data directly from the PDF without any modification or upscaling.
"""

import os
import pymupdf

pdf_path = r"D:/Downloads/dog_list-1.pdf"
output_dir = r"d:/HaBan/public/animals"

def main():
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found!")
        return

    os.makedirs(output_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    print(f"Opened {pdf_path}: {len(doc)} pages.")

    total_saved = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        img_infos = page.get_image_info(xrefs=True)
        img_infos.sort(key=lambda x: x['bbox'][1])

        for idx, info in enumerate(img_infos):
            xref = info['xref']
            base_img = doc.extract_image(xref)
            img_bytes = base_img['image']
            
            # Save both .jpeg and .jpg so all references in codebase resolve correctly
            p_jpeg = os.path.join(output_dir, f"dog_p{page_num+1}_{idx+1}.jpeg")
            p_jpg = os.path.join(output_dir, f"dog_p{page_num+1}_{idx+1}.jpg")
            
            with open(p_jpeg, "wb") as f:
                f.write(img_bytes)
            with open(p_jpg, "wb") as f:
                f.write(img_bytes)
                
            total_saved += 1

    print(f"Successfully extracted {total_saved} original raw dog images (saved both .jpeg and .jpg) to {output_dir}")

if __name__ == "__main__":
    main()
