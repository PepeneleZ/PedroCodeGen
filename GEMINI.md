# Pedro Pathing Visualizer

## Project Overview
Pedro Pathing Visualizer is a React-based web application designed for FTC (First Tech Challenge) robotics teams. It provides an interactive interface to design, visualize, and generate Java code for autonomous robot paths using the [Pedro Pathing](https://github.com/Pedro-Pathing) library.

## Main Technologies
- **Frontend**: React, TypeScript, Vite
- **Canvas/Graphics**: `react-konva` (Konva.js)
- **Styling**: Tailwind CSS

## Building and Running
- **Install dependencies**: `npm install`
- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Development Conventions
- **Code Organization**: Source code is located in `src/`. Components are in `src/components/`, data types in `src/types/`, utilities in `src/utils/`, and custom hooks in `src/hooks/`.
- **Styling**: Uses Tailwind CSS classes directly in JSX/TSX.
- **Interactions**: Mouse modifiers are used for creation:
  - **Ctrl+Click**: Create a new pose.
  - **Shift+Click**: Create a path between the last created path endpoint and the clicked pose.
- **State**: Centralized state management in `App.tsx` handles Pose/Path sequences, selections, and configuration.

## Key Files
- `src/App.tsx`: Main application entry and layout manager.
- `src/components/Field.tsx`: Renders the FTC field and handles interactive events (select, drag, create).
- `src/components/PathChain.tsx`: Renders the paths and curve control points.
- `src/components/CodeGenerator.tsx`: Generates the Java `PathChain` code.
- `src/types/index.ts`: Defines core data structures (`Pose`, `Path`, `PathChain`).
- `src/utils/bezier.ts`: Handles Bezier curve path calculations.
- `src/utils/coordinates.ts`: Field to canvas coordinate conversion logic.
