# Pedro Pathing Visualizer

A React-based web application for visualizing and generating paths for the FTC robotics library [Pedro Pathing](https://github.com/Pedro-Pathing).

## Features

- **144" × 144" FTC Field Canvas** - Accurate representation of the competition field
- **Cubic Bezier Curves** - Smooth path visualization between control points
- **Draggable Points** - Click and drag to position points, paths update in real-time
- **Heading Visualization** - Green arrows show robot orientation at each point
- **Code Generation** - Live Java code generation compatible with Android Studio
- **PathChain Support** - Build multiple paths with heading interpolation options
- **Advanced Path Constraints** - Timeout, T-value, velocity, translational, and heading constraints
- **Deceleration Control** - Global deceleration settings with braking strength and start timing
- **Advanced Callbacks** - Parametric, temporal, pose-based, and custom callbacks
- **Action Timing** - Before/after path execution for autonomous routines
- **Undo/Redo** - Full command history with Ctrl+Z/Ctrl+Y support
- **Download Java File** - Export complete OpMode class ready for Android Studio

## Technical Stack

- **Framework**: React + TypeScript + Vite
- **Canvas**: react-konva
- **Styling**: Tailwind CSS

## Compatibility Notes

- **Pedro Pathing v2.x**: The generated code uses the current PathBuilder API with full support for advanced features
- **Advanced Features**: Now includes path constraints (5 types), deceleration control, and advanced callbacks (parametric, temporal, pose-based)
- **API Changes**: Pedro Pathing v2.x uses a different API than earlier versions. Always verify generated code against the [official documentation](https://pedropathing.com/docs/pathing)

## Pedro Pathing Integration

The generated code uses Pedro Pathing v2.x API with PathBuilder and includes all advanced features:

```java
// Generated code example with advanced features
Pose p0 = new Pose(28.5, 128, Math.toRadians(180));
Pose p1 = new Pose(60, 85, Math.toRadians(135));

PathChain myPathChain = follower.pathBuilder()
    .addPath(new BezierLine(p0, p1))
    .setLinearHeadingInterpolation(p0.getHeading(), p1.getHeading())
    .setPathEndTimeoutConstraint(3000)           // 3 second timeout
    .setPathEndVelocityConstraint(30)             // Max 30 in/s
    .setPathEndTranslationalConstraint(2.0)       // 2 inch tolerance
    .build();

// Global deceleration settings
myPathChain.setGlobalBrakingStrength(2.5);
myPathChain.setBrakingStart(0.7);

// Advanced callbacks
myPathChain.addParametricCallback(0.5, () -> {
    // Execute at 50% path completion
    lift.setPosition(0.8);
});

myPathChain.addTemporalCallback(1500, () -> {
    // Execute after 1.5 seconds
    intake.run();
});

myPathChain.addPoseCallback(new Pose(45, 90, Math.toRadians(90)), 0.6, () -> {
    // Execute when near specific pose
    score();
});

follower.followPath(myPathChain, true);
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:5173

## Usage

1. Click on the field to add control points
2. Drag points to adjust positions
3. Click a point to edit its properties:
   - Position and heading
   - Path constraints (timeout, velocity, accuracy)
   - Segment type (line/curve) and heading interpolation
   - Actions and timing
4. Use the right panel to configure:
   - Global deceleration settings
   - Path-specific callbacks (parametric, temporal, pose-based)
5. Copy the generated Java code to your FTC project

## Advanced Features

### Path Constraints
- **Timeout Constraint**: Maximum time allowed for path completion
- **T-Value Constraint**: Path completion percentage requirement
- **Velocity Constraint**: Maximum velocity limit
- **Translational Constraint**: Position accuracy tolerance
- **Heading Constraint**: Heading accuracy tolerance

### Deceleration Control
- **Global Deceleration**: Enable coordinated braking across the entire path
- **Braking Strength**: Control deceleration aggressiveness (0.1-5.0)
- **Braking Start**: When to begin deceleration (0.0-1.0 path completion)

### Advanced Callbacks
- **Parametric Callbacks**: Execute at specific path completion percentages
- **Temporal Callbacks**: Execute after specific time delays
- **Pose Callbacks**: Execute when robot reaches specific positions
- **Custom Callbacks**: User-defined callback logic

## Keyboard Shortcuts

- Click on empty space: Add new point
- Drag point: Move point
- Click point: Select for editing
- Clear All: Remove all paths
