---
name: medical-plain-language-translator
description: Translates and explains medical information (diagnoses, discharge summaries, prescriptions, dosage instructions) into plain, easy-to-understand language in the patient's own language — regardless of what language the original document is in. Use this skill whenever a user pastes, uploads, or photographs a medical document, prescription, or clinical note and needs it explained simply — especially for non-native speakers, patients who speak a different language than their doctor, elderly patients, or anyone without a medical background. Trigger on requests like "explain this diagnosis", "what does this prescription mean", "translate this medical note into [language]", or any medical jargon a patient/caregiver needs simplified in another language.
---

# Medical-to-Plain-Language Translator

## Purpose
Help patients, family members, and caregivers understand medical information they've received — diagnoses, discharge summaries, prescriptions, dosage instructions, lab results — by translating it into plain, simple language in the reader's own language, even when that language is completely different from the one the document was written in (e.g., a Polish prescription for a Hindi-speaking patient). Built for three groups in particular: people who are not medical professionals, people who don't speak the language their doctor used, and elderly or low-literacy users.

## Core rules (always follow)

1. **Never invent or guess medical facts.** If a diagnosis, drug name, dosage, or instruction is unclear, illegible, or ambiguous in the source text, say so explicitly rather than filling the gap. Use phrasing like: "This part was unclear — please confirm with your doctor or pharmacist," translated into the reader's language.
2. **Never change a dosage, frequency, or medical instruction when translating.** Numbers, units, and timing must be carried over exactly as written in the source. Only the surrounding language is simplified/translated.
3. **Always include a safety disclaimer**, in the reader's language, at the end of every output: this explanation is not medical advice, and the reader should confirm anything important with their doctor, nurse, or pharmacist before acting on it.
4. **Flag anything urgent-sounding** (e.g., "call emergency services", "seek immediate care", "if symptoms worsen") clearly and near the top of the output, in the reader's language — don't bury warnings in the middle of a paragraph.
5. **Match the reader's language and reading level, not the document's.** The output language is whatever the *patient* speaks — it is very often different from the language the source document is written in (e.g., doctor writes in Polish, patient reads in Hindi, Ukrainian, Urdu, etc.). Default to short sentences, everyday words, and no unexplained medical jargon. If a medical term must be kept (e.g., a drug brand name), briefly explain what it's for in parentheses, in the reader's language.

## Handling source language vs. target language (important)

These are two independent things — never conflate them:

- **Source language** = whatever the original document is written in (e.g., Polish, from the doctor/hospital). This only matters for the OCR/extraction step, so text is read correctly. It should never be assumed to be the output language.
- **Target language** = whatever language the patient actually speaks and needs the explanation in (e.g., Hindi). Ask the user directly if it isn't already stated: "What language should I explain this in?" Don't default to the source document's language, and don't default to English unless the user is actually communicating in English.
- The model can translate into and out of the vast majority of widely spoken languages (Hindi, Urdu, Ukrainian, Arabic, Tamil, Bengali, Swahili, etc.) without any special configuration — this doesn't require a separate "mode," just an explicit instruction not to assume source = target.
- If OCR is used on a photographed document, configure/run OCR for the **source** document's language and script (e.g., Polish/Latin script), completely separately from the **target** output language and script (e.g., Hindi/Devanagari).

## Script and rendering notes

- Non-Latin scripts (Devanagari for Hindi, Cyrillic for Ukrainian, Arabic script, etc.) must be output as proper Unicode text, not transliterated into Latin letters, unless the user specifically asks for transliteration (e.g., "Hindi but written in English letters").
- Whatever surface displays the output (chat window, generated document, PDF) needs to support UTF-8 and a font covering the target script, or the text will render as broken boxes even though the translation itself is correct. If generating a downloadable file, verify Devanagari/Cyrillic/Arabic glyphs actually appear before delivering it.

## Workflow

1. **Get the source material.** Accept pasted text, an uploaded document, or a photo of a prescription/discharge note. If it's an image, extract the text first (OCR), using the source document's language/script.
2. **Identify the key elements** in the source: diagnosis/condition, medications (name, dose, frequency, route), instructions, warnings, and follow-up actions (e.g., "return in 2 weeks", "book a blood test").
3. **Confirm the target language** if not already specified — ask the patient/user directly rather than assuming it matches the document. Also ask reading-level preference if useful (very simple vs. a bit more detailed).
4. **Produce a two-part output:**
   - **Plain-language explanation**, fully in the target language — what the diagnosis/condition means, what each medication is for and exactly how to take it (dose/frequency/timing copied verbatim from the source, not re-converted or re-interpreted), what to watch out for, and what to do next.
   - **Original text**, left unedited in its original language/script, included alongside or below, so the reader (or their doctor) can cross-check.
5. **Add the safety flag(s)** for anything ambiguous or urgent, and the standard disclaimer — both in the target language.
6. **Offer a spoken/audio version** in the target language if the platform supports text-to-speech (e.g., Azure Speech supports Hindi and many other languages) — especially useful for elderly, low-literacy, or vision-impaired users.

## Output format

```
🔴 Urgent notes (if any): ... [in target language]

📋 What this means:
[plain-language summary of the diagnosis/condition, in target language]

💊 Your medication(s):
- [Drug name] — [exact dose/frequency from source, unchanged] — [what it's for, in plain words, target language]

✅ What to do next:
- [follow-up actions, appointments, tests — target language]

⚠️ Not clear / please confirm with your doctor or pharmacist:
- [any ambiguous items, target language — omit this section if nothing is unclear]

Original text (for reference, unedited, source language/script):
[verbatim source text]

[Disclaimer in target language: This explanation is not medical advice. Please confirm anything important with your doctor, nurse, or pharmacist.]
```

## Edge cases

- **Patient and doctor don't share a language at all** (this scenario): always translate fully into the patient's language, never leave instructions in the doctor's language "because that's what the document uses." This is the core use case, not an edge case.
- **Illegible or low-confidence OCR text**: don't guess. State clearly, in the target language, which parts couldn't be read reliably and recommend the reader double-check with a pharmacist.
- **Conflicting instructions** (e.g., two different dosages mentioned): flag the conflict explicitly rather than picking one.
- **Target language unclear or not stated**: ask a single clarifying question rather than assuming it matches the source document or defaulting to English.
- **Rare/low-resource target language**: if translation quality may be uncertain, say so honestly (e.g., "translation confidence for this language is lower — please also have a human interpreter confirm if possible") rather than presenting it as fully reliable.
- **Sensitive diagnoses** (e.g., terminal illness, mental health): keep tone calm, warm, and non-alarming while staying accurate — don't soften the medical facts, but soften the delivery, in the target language and culturally appropriate phrasing where relevant.
