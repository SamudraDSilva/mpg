const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()
const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const frontEndPlayers = {}
const frontEndProjectiles = {}

socket.on('connect', () => {
  socket.emit('initCanvas', {
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio
  })
})

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerID]?.color,
        velocity: backEndProjectile.velocity
      })
    } else {
      //already exist projectile
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }
  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) {
      delete frontEndProjectiles[id]
    }
  }
})

socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color
      })

      document.querySelector(
        '#playerLabel'
      ).innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${id}: ${backEndPlayer.score}}</div>`
    } else {
      //player already exist
      document.querySelector(
        `div[data-id="${id}"]`
      ).innerHTML = `${id}: ${backEndPlayer.score}`

      document
        .querySelector(`div[data-id="${id}"]`)
        .setAttribute('data-score', backEndPlayer.score)

      if (id === socket.id) {
        frontEndPlayers[id].x = backEndPlayer.x
        frontEndPlayers[id].y = backEndPlayer.y

        const lastBackEndInputIndex = playerInputs.findIndex((input) => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackEndInputIndex > -1) {
          playerInputs.splice(0, lastBackEndInputIndex + 1)
        }
        playerInputs.forEach((input) => {
          frontEndPlayers[id].x += input.dx
          frontEndPlayers[id].y += input.dy
        })
      } else {
        //for all other players

        gsap.to(frontEndPlayers[id], {
          x: backEndPlayer.x,
          y: backEndPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
    }
  }

  //for delete player
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)
      delete frontEndPlayers[id]
    }
  }
})
let animationId

function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id]
    frontEndPlayer.draw()
  }
  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    frontEndProjectile.draw()
  }
}

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}
const MOVEMENTSPEED = 10
const playerInputs = []
let sequenceNumber = 0

setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -MOVEMENTSPEED })
    frontEndPlayers[socket.id].y -= MOVEMENTSPEED
    socket.emit('keyDown', { keyCode: 'KeyW', sequenceNumber })
  }
  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: MOVEMENTSPEED })
    frontEndPlayers[socket.id].y += MOVEMENTSPEED
    socket.emit('keyDown', { keyCode: 'KeyS', sequenceNumber })
  }
  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -MOVEMENTSPEED, dy: 0 })
    frontEndPlayers[socket.id].x -= MOVEMENTSPEED
    socket.emit('keyDown', { keyCode: 'KeyA', sequenceNumber })
  }
  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: MOVEMENTSPEED, dy: 0 })
    frontEndPlayers[socket.id].x += MOVEMENTSPEED
    socket.emit('keyDown', { keyCode: 'KeyD', sequenceNumber })
  }
}, 15)

animate()
window.addEventListener('keydown', (e) => {
  if (!frontEndPlayers[socket.id]) return
  switch (e.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyS':
      keys.s.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
  }
})
window.addEventListener('keyup', (e) => {
  if (!frontEndPlayers[socket.id]) return
  switch (e.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyS':
      keys.s.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})
