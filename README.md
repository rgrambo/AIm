![Image](https://imgur.com/tkml1KI.gif)

# AIm
A game where the players compete by altering code in order to create the smartest AI. Or at least, the one that will win!

The player is given template code, which show's functions for a standard AI. This gives the player a place to start. All code changes are contained and will not contaminate the overlying server. All the server does is call the user's function!

## Why
I wanted to create a website that allowed people to compete against eachother in development. This game seemed like a good fit, and by keeping the logistics of the battle simple, it allows it to scale much better.

## Specs
Built with a express backend with a basic http front-end (Both using node).

## Fun Fact
To get a smoother motion for the gameplay, the viewer is actually seeing a delayed version of what is happening. Because all of the "players" are AI, I'm able to run the game ahead of time, which allows me to make the AI seem much smoother, as I am unable to do the tricks that normal game development does for real time, because I cannot reveal to any player how the other player's AI is expected to move (how it's written).

## To Run it Locally:
---

### Step 1
```
npm install
```

### Step 2
Install [ngrok](https://ngrok.com/) 
```
ngrok.exe http 3000 (terminal 1)
```

### Step 3
Update index.js URL to use your ngrok (var URL = "https://example.ngrok.io");

### Step 4
Within the client folder (terminal 2)
```
npm run serve
```

### Step 5
Within the server folder (terminal 3)
```
node app.js
```

### Step 6
Go to your url given from http-server, and enjoy! 
Feel free to open multiple tabs to play against yourself!

Notes:
If you have access to a server, it would be easier to simply put it all on a server, and start app.js

TODO:
1. Fix Start Button
2. Finish Preview View
3. Create actual login system
