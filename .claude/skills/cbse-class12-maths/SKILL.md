---
name: cbse-class12-maths
description: CBSE Class 12 Mathematics (2026) paper pattern, section-wise question counts and marks, unit-wise marking scheme, competency weightage and Q.P. code meaning. Use when adding, tagging, ordering or building CBSE Class 12 maths questions, mocks or papers (Sections A to E).
---

# CBSE Class 12 Mathematics (2026)

Total 100 marks: **80 marks theory (3 hours)** + **20 marks internal assessment**. The theory paper has **38 compulsory questions in 5 sections**.

## Subject codes
- **041**: Mathematics (Core / Standard, Science and Commerce streams)
- **241**: Applied Mathematics (Commerce and Humanities streams)

## Q.P. (question paper) code, for example 65/1/1, 65/2/3, 65/S/1
Printed top right as XX / Y / Z, next to a random Series Code (such as PQSR2 or 1PQRS).
- **First number (65)**: CBSE's internal subject code for Class 12 Mathematics (041).
- **Second number or letter (1, 2, 3, 4, 5, B, C, S)**: region / batch version.
  - There is no single "Foreign" or "Delhi-only" code any more. CBSE makes 5 main question paper versions (65/1/x to 65/5/x) and gives each version to clusters of regions in India (Delhi, Bengaluru, Noida, Chennai, Ajmer, Guwahati, Pune ...) and international centres (Gulf, Singapore, Malaysia ...). Regions with the same middle number get exactly the same paper.
  - Letters (S, C, B): supplementary / compartment exams (65/S/1) or special categories (for example visually impaired).
- **Third number (1, 2, 3)**: set number inside one exam hall. The three sets of one version share about 70 to 80% of the questions in shuffled order; 20 to 30% are varied questions of equal difficulty.

## Paper pattern (theory, 80 marks)
- 38 questions, all compulsory (no overall choice; internal OR choices in Sections B, C, D and E).
- 3 hours plus 15 minutes reading time. **No negative marking.**

| Section | Question type | Questions | Marks each | Total | Internal choice (OR) |
|---|---|---|---|---|---|
| A | 18 MCQ + 2 Assertion-Reason | 20 | 1 | 20 | none |
| B | Very Short Answer (VSA) | 5 | 2 | 10 | in 2 questions |
| C | Short Answer (SA) | 6 | 3 | 18 | in 3 questions |
| D | Long Answer (LA) | 4 | 5 | 20 | in 2 questions |
| E | Case study / source based (with sub-parts) | 3 | 4 | 12 | in 2 questions (in the 2-mark sub-part) |
| **Total** | | **38** | | **80** | 9 internal choices |

## Unit-wise marks (theory, 80)
| Unit | Name | Chapters | Marks |
|---|---|---|---|
| I | Relations and Functions | Relations and Functions, Inverse Trigonometric Functions | 8 |
| II | Algebra | Matrices, Determinants | 10 |
| III | Calculus | Continuity and Differentiability, Applications of Derivatives, Integrals, Application of Integrals, Differential Equations | 35 |
| IV | Vectors and 3D Geometry | Vector Algebra, Three-Dimensional Geometry | 14 |
| V | Linear Programming | Linear Programming Problems (graphical method) | 5 |
| VI | Probability | Conditional Probability, Bayes' Theorem, Independent Events | 8 |
| | **Total theory** | | **80** |

Internal assessment: 20 marks (outside the 80).

## Competency weightage
- 55% (44 marks): Remembering and Understanding (routine formula / concept application)
- 25% (20 marks): Applying (familiar and unfamiliar contexts)
- 20% (16 marks): Analysing, Evaluating and Creating (includes case-based and Assertion-Reason questions)

## How this site uses it
- The database scheme `CBSE 12` in `supabase/schema.sql` (table `marking_schemes`): sections A 20 x 1, B 5 x 2, C 6 x 3, D 4 x 5, E 3 x 4 = 38 questions, 80 marks, 180 minutes, no negative marking. Questions carry `sec` = A to E.
- In a CBSE mock the sections stay in order A, B, C, D, E, and questions are shuffled only inside a section (see `portal.js`, `modeFull`).
- Sections B to E are written-answer sections; on this site they are shown as 4 options (or several correct options) made from the solutions, and each question keeps its section letter.
