const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
const backEndPlayers = {}
const backEndProjectiles = {}
let projectileID = 0
const playerRADIUS = 10

io.on('connection', (socket) => {
  console.log('a user connected')
  backEndPlayers[socket.id] = {
    x: 500 * Math.random(),
    y: 500 * Math.random(),
    color: `hsl(${Math.random() * 360},100%,50%)`,
    sequenceNumber: 0,
    score: 0
  }
  io.emit('updatePlayers', backEndPlayers)
  console.log(backEndPlayers)

  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
  })
  socket.on('initCanvas', ({ width, height, devicePixelRatio }) => {
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }
    backEndPlayers[socket.id].radius = playerRADIUS
    if (devicePixelRatio > 1) {
      backEndPlayers[socket.id].radius = 2 * playerRADIUS
    }
  })

  const MOVEMENTSPEED = 10
  socket.on('keyDown', ({ keyCode, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keyCode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= MOVEMENTSPEED
        break
      case 'KeyS':
        backEndPlayers[socket.id].y += MOVEMENTSPEED
        break
      case 'KeyA':
        backEndPlayers[socket.id].x -= MOVEMENTSPEED
        break
      case 'KeyD':
        backEndPlayers[socket.id].x += MOVEMENTSPEED
        break
    }
  })

  socket.on('shoot', ({ x, y, angle }) => {
    projectileID++
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    backEndProjectiles[projectileID] = {
      playerID: socket.id,
      x,
      y,
      angle,
      velocity
    }
  })
})
const ProjectileRADIUS = 5
setInterval(() => {
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

    if (
      backEndProjectiles[id].x - ProjectileRADIUS >
        backEndPlayers[backEndProjectiles[id].playerID]?.canvas?.width ||
      backEndProjectiles[id].x + ProjectileRADIUS < 0 ||
      backEndProjectiles[id].y - ProjectileRADIUS >
        backEndPlayers[backEndProjectiles[id].playerID]?.canvas?.height ||
      backEndProjectiles[id].y + ProjectileRADIUS < 0
    ) {
      delete backEndProjectiles[id]
      continue
    }
    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]

      const dist = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      )
      if (
        dist - (backEndPlayer.radius + ProjectileRADIUS) < 0 &&
        backEndProjectiles[id].playerID !== playerId
      ) {
        if (backEndPlayers[backEndProjectiles[id].playerID])
          backEndPlayers[backEndProjectiles[id].playerID].score++

        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
