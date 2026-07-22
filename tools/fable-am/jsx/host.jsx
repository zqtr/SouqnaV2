// Fable-aM host — runs inside After Effects (ExtendScript, ES3).
// The panel writes generated code to a temp file; FAM_runFile executes it
// inside an undo group and returns "OK" or "ERR: <message> @line <n>".

function FAM_runFile(path) {
  var f = new File(path);
  if (!f.exists) return "ERR: temp script not found: " + path;
  app.beginUndoGroup("Fable-aM");
  try {
    $.evalFile(f);
    app.endUndoGroup();
    return "OK";
  } catch (e) {
    app.endUndoGroup();
    return "ERR: " + e.toString() + (e.line ? " @line " + e.line : "");
  }
}

// Render one frame of the active comp to PNG (for the visual review pass).
// atTime is optional; defaults to the playhead, clamped to the comp.
function FAM_saveFrame(path, atTime) {
  try {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return "ERR: no active comp";
    var t = (typeof atTime === "number") ? atTime : comp.time;
    if (t < 0) t = 0;
    if (t > comp.duration - comp.frameDuration) t = comp.duration - comp.frameDuration;
    comp.saveFrameToPng(t, new File(path));
    return "OK";
  } catch (e) {
    return "ERR: " + e.toString();
  }
}

// Snapshot of the active comp + selection, as a JSON string the panel feeds
// to the model. Hand-built JSON — ExtendScript has no JSON object.
function FAM_getContext() {
  function esc(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      .replace(/\n/g, "\\n").replace(/\r/g, "");
  }
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) {
    var pn = app.project.file ? app.project.file.name : null;
    return '{"project":' + (pn ? '"' + esc(pn) + '"' : "null") + ',"comp":null}';
  }
  function n1(v) { return Math.round(v * 10) / 10; }
  function vec(v) {
    var out = [];
    for (var k = 0; k < v.length; k++) out.push(n1(v[k]));
    return "[" + out.join(",") + "]";
  }
  var parts = [];
  for (var i = 0; i < comp.selectedLayers.length; i++) {
    var L = comp.selectedLayers[i];
    var kind = L instanceof TextLayer ? "text"
      : L instanceof ShapeLayer ? "shape"
      : L instanceof CameraLayer ? "camera"
      : L instanceof LightLayer ? "light"
      : L.nullLayer ? "null" : "av";
    var geo = "";
    try {
      var xf = L.property("ADBE Transform Group");
      var p = xf.property("ADBE Position").value;
      var a = xf.property("ADBE Anchor Point").value;
      var s = xf.property("ADBE Scale").value;
      geo += ',"position":' + vec(p) + ',"scale":' + vec(s) +
        ',"rotation":' + n1(xf.property("ADBE Rotate Z").value) +
        ',"opacity":' + n1(xf.property("ADBE Opacity").value);
      // Comp-space bounds (ignores rotation/parenting — good enough for placement)
      var r = L.sourceRectAtTime(comp.time, false);
      var sx = s[0] / 100, sy = s[1] / 100;
      geo += ',"boundsInComp":{"left":' + n1(p[0] + (r.left - a[0]) * sx) +
        ',"top":' + n1(p[1] + (r.top - a[1]) * sy) +
        ',"width":' + n1(r.width * sx) +
        ',"height":' + n1(r.height * sy) + "}";
    } catch (e) { /* cameras/lights have no rect — geometry stays partial */ }
    var fxNames = [];
    try {
      var fxg = L.property("ADBE Effect Parade");
      for (var f = 1; f <= fxg.numProperties; f++) {
        fxNames.push('"' + esc(fxg.property(f).matchName) + '"');
      }
    } catch (e2) { /* no effects group on this layer type */ }
    var anim = [];
    try {
      var xf2 = L.property("ADBE Transform Group");
      var props = [["ADBE Anchor Point", "anchor"], ["ADBE Position", "position"],
        ["ADBE Scale", "scale"], ["ADBE Rotate Z", "rotation"], ["ADBE Opacity", "opacity"]];
      for (var k2 = 0; k2 < props.length; k2++) {
        var pr = xf2.property(props[k2][0]);
        if (pr && pr.numKeys > 0) anim.push('"' + props[k2][1] + '"');
      }
    } catch (e3) { /* partial transform group (camera/light) */ }
    parts.push('{"index":' + L.index + ',"name":"' + esc(L.name) +
      '","kind":"' + kind + '","inPoint":' + L.inPoint.toFixed(2) +
      ',"outPoint":' + L.outPoint.toFixed(2) + geo +
      ',"effects":[' + fxNames.join(",") + '],"animated":[' + anim.join(",") + ']}');
  }
  var names = [];
  for (var j = 1; j <= Math.min(comp.numLayers, 30); j++) {
    names.push('"' + esc(comp.layer(j).name) + '"');
  }
  var projName = app.project.file ? app.project.file.name : null;
  return '{"project":' + (projName ? '"' + esc(projName) + '"' : "null") +
    ',"comp":{"name":"' + esc(comp.name) + '","width":' + comp.width +
    ',"height":' + comp.height + ',"duration":' + comp.duration.toFixed(2) +
    ',"frameRate":' + comp.frameRate + ',"time":' + comp.time.toFixed(2) +
    ',"numLayers":' + comp.numLayers + ',"layerNames":[' + names.join(",") +
    ']},"selectedLayers":[' + parts.join(",") + "]}";
}
