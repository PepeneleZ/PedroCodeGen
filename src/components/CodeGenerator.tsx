import { useMemo } from 'react';
import { PathChain } from '../types';

interface CodeGeneratorProps {
  pathChain: PathChain;
}

export const CodeGenerator = ({ pathChain }: CodeGeneratorProps) => {
  const generatedCode = useMemo(() => {
    const poses = pathChain.poses;
    const paths = pathChain.paths;

    const formatHeading = (value?: number) => value !== undefined ? `Math.toRadians(${value.toFixed(1)})` : 'Math.toRadians(0.0)';

    if (poses.length < 2) {
      return '// Add 2+ poses to generate code';
    }

    const lines: string[] = [];

    const poseVarNames: Record<string, string> = {};
    poses.forEach((wp, i) => {
      const varName = (wp.name || `p${i}`).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
      poseVarNames[wp.id] = varName;
      const headingValue = formatHeading(wp.heading);
      lines.push(`Pose ${varName} = new Pose(${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${headingValue});`);
    });
    lines.push('');

    paths.forEach((path, pathIndex) => {
      const pathVarName = (path.name || `path${pathIndex + 1}`).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
      lines.push(`PathChain ${pathVarName};`);
    });
    lines.push('');

    lines.push('public void buildPaths(Follower follower) {');

    paths.forEach((path, pathIndex) => {
      const startPose = poses.find(w => w.id === path.startPoseId);
      const endPose = poses.find(w => w.id === path.endPoseId);
      if (!startPose || !endPose) return;

      const startName = poseVarNames[startPose.id];
      const endName = poseVarNames[endPose.id];
      const pathVarName = (path.name || `path${pathIndex + 1}`).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');

      const headingInterp = (() => {
        if (path.headingInterpolation === 'tangent') {
          return 'setTangentHeadingInterpolation()';
        }
        if (path.headingInterpolation === 'constant') {
          return `setConstantHeadingInterpolation(${formatHeading(path.constantHeading)})`;
        }

        const startHeading = path.startHeadingOverride !== undefined
          ? formatHeading(path.startHeadingOverride)
          : `${startName}.getHeading()`;
        const endHeading = path.endHeadingOverride !== undefined
          ? formatHeading(path.endHeadingOverride)
          : `${endName}.getHeading()`;

        return `setLinearHeadingInterpolation(${startHeading}, ${endHeading})`;
      })();

      if (path.type === 'curve' && path.controlPoint1 && path.controlPoint2) {
        lines.push(`    ${pathVarName} = follower.pathBuilder().addPath(`);
        lines.push(`            new BezierCurve(`);
        lines.push(`                    ${startName},`);
        lines.push(`                    new Pose(${path.controlPoint1.x.toFixed(1)}, ${path.controlPoint1.y.toFixed(1)}, 0.0),`);
        lines.push(`                    new Pose(${path.controlPoint2.x.toFixed(1)}, ${path.controlPoint2.y.toFixed(1)}, 0.0),`);
        lines.push(`                    ${endName}`);
        lines.push(`            )`);
      } else {
        lines.push(`    ${pathVarName} = follower.pathBuilder().addPath(`);
        lines.push(`            new BezierLine(`);
        lines.push(`                    ${startName},`);
        lines.push(`                    ${endName}`);
        lines.push(`            )`);
      }

      lines.push(`    ).${headingInterp}`);

      // Path constraints
      if (path.timeoutConstraint !== undefined && path.timeoutConstraint > 0) {
        lines.push(`    .setTimeoutConstraint(${Math.round(path.timeoutConstraint)})`);
      }
      if (path.tValueConstraint !== undefined && path.tValueConstraint > 0 && path.tValueConstraint <= 1) {
        lines.push(`    .setTValueConstraint(${path.tValueConstraint.toFixed(2)})`);
      }
      if (path.velocityConstraint !== undefined && path.velocityConstraint > 0) {
        lines.push(`    .setVelocityConstraint(${path.velocityConstraint.toFixed(1)})`);
      }
      if (path.translationalConstraint !== undefined && path.translationalConstraint > 0) {
        lines.push(`    .setTranslationalConstraint(${path.translationalConstraint.toFixed(1)})`);
      }
      if (path.headingConstraint !== undefined) {
        lines.push(`    .setHeadingConstraint(${path.headingConstraint.toFixed(1)})`);
      }

      // Deceleration and braking
      if(path.deceleration === 'default' && path.brakingStrength !== undefined && (path.brakingStrength ?? 0) > 0) {
        lines.push(`    .setBreakingStrength(${path.brakingStrength.toFixed(1)})`);
      }
      if (path.deceleration === 'global') {
        if ((path.brakingStrength ?? 0) > 0 && path.brakingStrength !== undefined) {
          lines.push(`    .setGlobalDeceleration(${path.brakingStrength.toFixed(1)})`);
        } else {
          lines.push(`    .setGlobalDeceleration()`);
        }
      }
      if (path.deceleration === 'global' && (path.brakingStart ?? 0) > 0) {
        lines.push(`    .setBrakingStart(${path.brakingStart?.toFixed(1)})`);
      }
      if (path.deceleration === 'none') {
        lines.push(`    .setNoDeceleration()`);
      }

      // Callbacks
      if (path.callbacks && path.callbacks.length > 0) {
        path.callbacks.forEach(cb => {
          const actionCode = cb.customCallbackCode || `() -> {\n        /* ${cb.action} */\n    }`;
          
          if (cb.parametricPercent !== undefined) {
            lines.push(`    .addParametricCallback(${cb.parametricPercent.toFixed(3)}, ${actionCode})`);
          } else if (cb.temporalMillis !== undefined) {
            lines.push(`    .addTemporalCallback(${Math.round(cb.temporalMillis)}, ${actionCode})`);
          } else if (cb.poseCallback) {
            const h = cb.poseCallback.heading !== undefined ? `Math.toRadians(${cb.poseCallback.heading.toFixed(1)})` : 'Math.toRadians(0.0)';
            lines.push(`    .addPoseCallback(new Pose(${cb.poseCallback.x.toFixed(1)}, ${cb.poseCallback.y.toFixed(1)}, ${h}), ${actionCode})`);
          } else {
             // Fallback to custom action if defined but no trigger type
             if (cb.customCallbackCode) {
               lines.push(`    .addPathCallback(${cb.customCallbackCode})`);
             }
          }
        });
      }

      lines.push(`    .build();`);
      lines.push('');
    });

    lines.push('}');

    return lines.join('\n');
  }, [pathChain]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const downloadJavaFile = () => {
    const className = pathChain.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(\d)/, 'Path_$1') || 'AutoPath';

    const fullCode = `package org.firstinspires.ftc.teamcode;

import com.pedro-pathing.follower.Follower;
import com.pedro-pathing.constants.FollowerConstants;
import com.pedro-pathing.pathing.BezierCurve;
import com.pedro-pathing.pathing.BezierLine;
import com.pedro-pathing.pathing.Path;
import com.pedro-pathing.pathing.PathChain;
import com.pedro-pathing.util.Pose;

public class ${className} {
    ${generatedCode.replace(/\n/g, '\n    ')}
}
`;

    const blob = new Blob([fullCode], { type: 'text/java' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className}.java`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Generated Java Code</h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors font-mono"
          >
            Copy
          </button>
          <button
            onClick={downloadJavaFile}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors font-mono"
          >
            Download .java
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 font-mono">
        <span>{pathChain.paths.length} path(s) · {pathChain.poses.length} pose(s)</span>
      </div>

      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-[600px] font-mono leading-relaxed">
        <code>{generatedCode}</code>
      </pre>
    </div>
  );
};
