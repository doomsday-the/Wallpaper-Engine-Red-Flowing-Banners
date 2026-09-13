const { exec } = require('child_process');
exec(`start "" "C:\\Riot Games\\VALORANT\\live\\VALORANT.exe"`, (err, stdout, stderr) => {
    console.log(err);
});
