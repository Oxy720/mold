/**
 * MOLD — host.jsx
 * Creates bins inside the Premiere Pro project panel (no disk I/O).
 */

function getProjectFolder() {
  try {
    if (app.projects.numProjects === 0) return 'NO_PROJECT';
    var projectPath = app.project.path;
    if (!projectPath || projectPath === '') return 'NO_PROJECT';
    return 'OK';
  } catch (e) {
    return 'ERROR:' + e.message;
  }
}

/**
 * createBins(pathsJSON)
 * pathsJSON: JSON string array of paths, e.g. ["01_FOOTAGE","01_FOOTAGE/RAW","02_AUDIO"]
 * Paths with "/" are nested — each segment becomes a child bin.
 * Returns "OK" or "ERROR:..."
 */
function createBins(pathsJSON) {
  try {
    var paths = JSON.parse(pathsJSON);
    var root  = app.project.rootItem;

    for (var i = 0; i < paths.length; i++) {
      var segments = paths[i].split('/');
      var parent   = root;

      for (var s = 0; s < segments.length; s++) {
        var seg  = segments[s];
        if (!seg || seg === '') continue;

        // Check if bin already exists at this level
        var existing = null;
        for (var c = 0; c < parent.children.numItems; c++) {
          var child = parent.children[c];
          // type 2 = bin
          if (child.type === ProjectItemType.BIN && child.name === seg) {
            existing = child;
            break;
          }
        }

        if (existing) {
          parent = existing;
        } else {
          parent.createBin(seg);
          // createBin doesn't return the new bin — find it
          for (var c2 = 0; c2 < parent.children.numItems; c2++) {
            var newChild = parent.children[c2];
            if (newChild.type === ProjectItemType.BIN && newChild.name === seg) {
              parent = newChild;
              break;
            }
          }
        }
      }
    }

    return 'OK';
  } catch (e) {
    return 'ERROR:' + e.message;
  }
}
