import { useMemo } from 'react';
import { PathChain } from '../types';

interface CodeGeneratorProps {
  pathChain: PathChain;
}

export const CodeGenerator = ({ pathChain }: CodeGeneratorProps) => {
  const generatedCode = useMemo(() => {
    const waypoints = pathChain.waypoints;
    const paths = pathChain.paths;

    const formatHeading = (value?: number) => value !== undefined ? `Math.toRadians(${value.toFixed(1)})` : 'Math.toRadians(0.0)';

    if (waypoints.length < 2) {
      return '// Add 2+ waypoints to generate code';
    }

    const lines: string[] = [];

    const waypointVarNames: Record<string, string> = {};
    waypoints.forEach((wp, i) => {
      const varName = (wp.name || `p${i}`).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
      waypointVarNames[wp.id] = varName;
      const headingValue = formatHeading(wp.heading);
      lines.push(`Pose ${varName} = new Pose(${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${headingValue});`);
    });
    lines.push('');

    paths.forEach((path, pathIndex) => {
      const pathVarName = (path.name || `path${pathIndex}`).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
      lines.push(`PathChain ${pathVarName};`);
    });
    lines.push('');

    lines.push('public void buildPaths(Follower follower) {');

    paths.forEach((path, pathIndex) => {
      const startWp = waypoints.find(w => w.id === path.startWaypointId);
      const endWp = waypoints.find(w => w.id === path.endWaypointId);
      if (!startWp || !endWp) return;

      const startName = waypointVarNames[startWp.id];
      const endName = waypointVarNames[endWp.id];
      const pathVarName = (path.name || `path${pathIndex}`).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');

      const headingInterp = (() => {
        if (path.headingInterpolation === 'tangent') {
          return 'setTangentHeadingInterpolation()';
        }
        if (path.headingInterpolation === 'constant') {
          return `setConstantHeadingInterpolation(${formatHeading(path.constantHeading)})`;
        }

        const startHeading = path.startHeadingOverride !== undefined
          ? formatHeading(path.startHeadingOverride)
          : formatHeading(startWp.heading);
        const endHeading = path.endHeadingOverride !== undefined
          ? formatHeading(path.endHeadingOverride)
          : formatHeading(endWp.heading);

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
        lines.push(`    ).${headingInterp}`);
        lines.push(`    .build();`);
      } else {
        lines.push(`    ${pathVarName} = follower.pathBuilder().addPath(`);
        lines.push(`            new BezierLine(`);
        lines.push(`                    ${startName},`);
        lines.push(`                    ${endName}`);
        lines.push(`            )`);
        lines.push(`    ).${headingInterp}`);
        lines.push(`    .build();`);
      }
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

    const code = generatedCode;
    const blob = new Blob([code], { type: 'text/java' });
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
        <span>{pathChain.paths.length} path(s) · {pathChain.waypoints.length} waypoint(s)</span>
      </div>

      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-[600px] font-mono leading-relaxed">
        <code>{generatedCode}</code>
      </pre>
    </div>
  );
};
