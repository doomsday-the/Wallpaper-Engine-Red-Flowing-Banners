const { exec } = require('child_process');
exec(`start "" "https://github.com"`, (err, stdout, stderr) => {
    console.log(err);
});
