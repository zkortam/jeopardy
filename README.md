# Jeopardy Game App - ESA @ UCSD

A sleek, professional Jeopardy-style game application built with TypeScript and React, designed for the Egyptian Student Association at UC San Diego.

## Features

- **Team Management**: Create 2-5 teams with custom names
- **5 Categories**: 
  - ESA @ UCSD
  - UC San Diego
  - Egypt
  - Iraq
  - Culture & Heritage
- **Game Flow**:
  - Click cards to reveal questions
  - 30-second timer for initial answers
  - Correct answers add points
  - Incorrect answers deduct points and allow other teams to steal
  - 15-second timer for steal attempts
  - Continue until someone gets it correct or skip to next question
- **Leaderboard**: Final scores and winner display
- **Bilingual Support**: Arabic and English text throughout

## Design

- Matte black background (#1a1a1a)
- Professional gold accents (#d4af37)
- Clean, minimal design matching ESA @ UCSD website aesthetic
- Responsive layout optimized for projector display

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Setup**: Enter team names (2-5 teams required)
2. **Game Board**: Click on any question card to reveal the question
3. **Answering**: Select which team will answer, then mark as correct/incorrect
4. **Stealing**: If incorrect, other teams can attempt to steal
5. **Scoring**: Points are added/deducted automatically
6. **Finish**: When all questions are answered, view the leaderboard

### Buzzer System
- Host/admin view: open `/admin`
- Player view: open `/?room=ROOMCODE` (or `/room/ROOMCODE`)

## Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
