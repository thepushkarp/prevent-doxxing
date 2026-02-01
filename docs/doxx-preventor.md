## Doxx Preventor

## Motivation

This is a project I'm creating as a part of an OpenAI Hackathon.

#### Track I'm participating in

Multimodal Intelligence: Rich, immersive applications that reason and interact across multiple modalities.
- Build end-to-end experiences that combine text, images, and video into a cohesive user journey.
- Create interfaces where users can see, show, and interact, not just type prompts (e.g. visual inputs, generated media, interactive feedback).
- Demonstrate how multimodality enables more intuitive, expressive, or immersive experiences than text-only applications.

#### Judging Criteria

Submissions will be judged within their chosen track based on the following criteria:
1. Clarity of idea: Is the problem well-defined, and is it clear what the project is trying to achieve?
2. Track alignment: Does the project strongly align with the focus of the chosen track, and make effective use of the relevant tools or concepts?
3. Technical execution: Does the project work as described? Is the core functionality implemented correctly and thoughtfully?
4. Completeness: Is there a clear end-to-end workflow or experience that can be run, tested, or demonstrated, even if rough or minimal?
5. Impact & insight: Does the project demonstrate meaningful usefulness, insight, or creativity beyond a trivial demo?

---

Hosted Site: https://prevent-doxxing.thepushkarp.com/ (just set it up in Vercel and deployed it for CI from PR and pushing to main)

---

## Overview

Prevent Doxxing (open to changing the name later) is a web application that allows you to prevent doxxing of your personal and sensitive applications by automatically identifying and masking/redacting them, be it in your files (pdfs, docs, etc.) or in your images (photos, screenshots, document scans, etc.).

## Features

- Upload your files or images to the application
- Automatically identify and mask/redact the sensitive information types
- Selectors for popular sensitive information types
  - Text
    - SSN/Aadhar/PAN/Passport (Other Government IDs)
    - Phone Number
    - Email
    - Name (First, Last)
    - Address (Street, City, State, Country, Postal Code)
    - Date of Birth
    - Gender (Male, Female, Other)
    - Race (Asian, Black, Hispanic, White, Native American, Pacific Islander, Other)
    - Others
  - Images
    - Any of the above sensitive information types in the image
    - Faces
    - Vehicle License Plate
    - House Number
    - Others
- For files, it will remove the sensitive information from the file and return the file with the sensitive information masked. The masked information will not be selectable/readable/searchable in the file.
- For images, it will mask the sensitive information from the image by drawing a black rectangle around the sensitive information using bounding boxes. The masked information will not be selectable/readable/searchable in the image.

Other considerations:
- Download the masked/redacted files or images.
- Will not destroy any other information in the file or image.
- In the UI, the users can have the option to keep/remove each of the sensitive information types or even any particular selection from the masking. They can also propose their own bounding box, text via chat to mask.
- The UI should be simple and intuitive, and the user should be able to easily understand the process and the results. Something even a 5 year old or a 80 year old should be able to use it easily.

## How it works

1. Upload your files or images
2. Automatically identify and mask/redact the sensitive information
3. The user can then select the sensitive information to mask/redact or propose their own changes.
4. Download the masked/redacted files or images

## Bounding Box Coordinates

- Model outputs can vary, so detections are normalized to a **0–1000** coordinate system using the processed image dimensions.
- Preview overlays are positioned using the **rendered image rect** (offsets + size) to avoid letterboxing shifts.
- Redaction converts normalized coords → pixels on the canvas before drawing.

## Tech Stack

- Next.js
- Tailwind CSS
- Shadcn UI
- OpenAI
- Vercel
- GitHub
- Biome (linting/formatting)
- Husky + lint-staged (pre-commit hooks)
