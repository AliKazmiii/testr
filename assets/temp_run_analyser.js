
            const { spawn } = require('child_process');
            const analyser = spawn('C:\Users\DEEBYTE COMPUTERS\Documents\Js\assets\analyser.exe', [], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            });
            analyser.unref();
        