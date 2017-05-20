import React, { Component } from 'react'
import './styles.css'
import Hud from '../Hud'

const SMOOTH_LENGTH = 8
const FRICTION = .5
const GRAVITY = 9.0
const SPEED = 10

const rand = (m, M) => m + (M - m) * Math.random()

const generateTrend = steps => {
	const points = Math.pow(2, steps)
	const res = new Array(points + 1)

	res[0]              = rand(0, 1)
	res[res.length - 1] = rand(0, 1)

	let size = points;

	while ((size = size / 2) >= 1) {
		for (let i = size; i < points; i += 2*size) {
			res[i] = (res[i - size] + res[i + size]) / 2 // Average
			res[i] += rand(-1, 1) * size / points // Add random part
			res[i] = Math.max(0, res[i])
		}
	}

	return res;
}

const sandHeight = generateTrend(4).map(x => .8 + .1 * x)
console.log(sandHeight)

const drawGraph = (ctx, xs, { title="undefined title", samples=100, width=150, height=100, min=null, max=null, color='#fff' } = {}) => {
	const m = (min === null ? Math.min(...xs) : min)
	const M = (max === null ? Math.max(...xs) : max)

	const s = Math.max(0, samples - xs.length)

	ctx.beginPath()
	ctx.moveTo(s * width / samples, height * (xs[xs.length - samples + s] - M)/(M - m))
	for (let i = s + 1; i < samples; i++) {
		ctx.lineTo(i * width / samples, height * (xs[xs.length - samples + i] - M)/(M - m))
	}
	ctx.strokeStyle = color
	ctx.lineWidth = 2
	ctx.stroke()
}

const generateGaussianKernel = n => {
	const gauss = x => Math.exp(-Math.pow(x, 2) / 2)
	const k = Array(n).fill().map((_,i) => gauss(i * 2 / n))
	const t = k.reduce((acc, e) => acc + e, 0)
	return k.map(e => e / t).reverse()
}

const smooth = (xs, kernel) => {
	return xs.reduce((acc, e, j) => acc + e * kernel[j], 0)
}

const kernel = generateGaussianKernel(SMOOTH_LENGTH)

class App extends Component {
	constructor() {
		super();

		this.state = {
			screen: {
				width: window.innerWidth,
				height: window.innerHeight,
				ratio: window.devicePixelRatio || 1,
			},
			context: null,
			actions: {
				jump: false,
				shoot: false,
			},
			history: {
				orientation: Array(SMOOTH_LENGTH).fill().map((_,i) => ({absolute: 0, alpha: 0, beta: 0, gamma: 0})),
				acceleration: Array(SMOOTH_LENGTH).fill().map((_,i) => ({x: 0, y: 0, z: 0}))
			},
			orientation: {
				absolute: 0,
				alpha: 0,
				beta: 0,
				gamma: 0,
			},
			acceleration: {
				x: 0,
				y: 0,
				z: 0,
			},
			speed: {
				x: 0,
				y: 0,
				z: 0,
			},
			position: {
				x: 0,
				y: 0,
				z: 0,
			},
			latest: Date.now(),
			debug: false,
		}
	}

	componentDidMount() {
		window.addEventListener('resize', this.handleResize.bind(this, false))
		window.addEventListener('deviceorientation', this.handleOrientation.bind(this, false), true)
		window.addEventListener('devicemotion', this.handleMotion.bind(this, false), false)
		window.addEventListener('keypress', this.handleKeyboard.bind(this, false))

		const context = this.refs.canvas.getContext('2d')
		this.setState({ context: context })

		requestAnimationFrame(() => { this.update() })
	}

	handleResize() {
		this.setState({
			screen: {
				width: window.innerWidth,
				height: window.innerHeight,
				ratio: window.devicePixelRatio || 1
			}
		})
	}

	handleKeyboard(_, event) {
		if (event.keyCode === 'd'.charCodeAt(0)) {
			this.setState({ debug: !this.state.debug })
		}
	}

	handleOrientation(_, event) {
		this.setState({ history: {
			orientation: this.state.history.orientation.slice(1 - SMOOTH_LENGTH).concat(event),
			acceleration: this.state.history.acceleration,
		}})

		this.setState({ orientation: {
			alpha: smooth(this.state.history.orientation.map(o => o.alpha), kernel) * Math.PI / 180,
			beta: smooth(this.state.history.orientation.map(o => o.beta), kernel) * Math.PI / 180,
			gamma: smooth(this.state.history.orientation.map(o => o.gamma), kernel) * Math.PI / 180,
		}})
	}

	handleMotion(_, event) {
		this.setState({ history: {
			orientation: this.state.history.orientation,
			acceleration: this.state.history.acceleration.slice(1 - SMOOTH_LENGTH).concat(event.accelerationIncludingGravity),
		}})

		this.setState({ acceleration: {
			x: smooth(this.state.history.acceleration.map(a => a.x), kernel),
			y: smooth(this.state.history.acceleration.map(a => a.y), kernel),
			z: smooth(this.state.history.acceleration.map(a => a.z), kernel),
		}})
	}

	update() {
		const now = Date.now()
		const dt = (now - this.state.latest) / 1000

		const acc = {
			x: this.state.acceleration.x - FRICTION * this.state.speed.x,// - GRAVITY * Math.sin(this.state.orientation.gamma),
			y: -this.state.acceleration.y - FRICTION * this.state.speed.y,// + GRAVITY * Math.sin(this.state.orientation.beta) * Math.cos(this.state.orientation.gamma),
			z: -this.state.acceleration.z - FRICTION * this.state.speed.z,// - GRAVITY * Math.cos(this.state.orientation.beta) * Math.cos(this.state.orientation.gamma),
		}

		this.setState({
			speed: {
				x: this.state.speed.x + acc.x * dt,
				y: this.state.speed.y + acc.y * dt,
				z: this.state.position.z <= 0 ? 0 : this.state.speed.z + acc.z * dt,
			}
		})

		this.setState({
			position: {
				x: this.state.position.x + SPEED * this.state.speed.x * dt,
				y: this.state.position.y + SPEED * this.state.speed.y * dt,
				z: Math.max(0, this.state.position.z + SPEED * this.state.speed.z * dt),
			}
		})

		this.setState({
			latest: now
		})

		const context = this.state.context
		const orientation = this.state.orientation

		context.save()
		context.scale(this.state.screen.ratio, this.state.screen.ratio)

		this.draw(context)

		context.restore()

		requestAnimationFrame(() => { this.update() })
	}

	draw(context) {
		// Background
		const ocean = context.createLinearGradient(0, 0, 0, this.state.screen.height)
		ocean.addColorStop(0, '#0cf')
		ocean.addColorStop(1, '#0f404c')
		context.fillStyle = ocean
		context.fillRect(0, 0, this.state.screen.width, this.state.screen.height)

		// Object
		context.save()
		context.fillStyle = '#c0f'
		context.translate(this.state.screen.width/2 + this.state.position.x, this.state.screen.height/2 +  + this.state.position.y)
		context.rotate(Math.atan2(this.state.speed.y, this.state.speed.x))
		context.fillRect(-32, -32, 64, 64)
		context.restore()

		// Light rays
		const light = context.createLinearGradient(0, 0, 0, this.state.screen.height / 2)
		light.addColorStop(0, 'rgba(255, 255, 255, .75)')
		light.addColorStop(1, 'rgba(255, 255, 255, 0)')
		context.fillStyle = light

		const t = Date.now() * Math.PI * 2
		const l = this.state.screen.height / 2

		for (let i = 0; i < 5; i++) {
			const x = 256 + 128 * Math.sin(i + t / 10000)
			const w = 48 + 8 * Math.sin(i + t / 15000)

			context.beginPath()
			context.moveTo(x, 0)
			context.lineTo(x + w, 0)
			context.lineTo(x + w + l, l)
			context.lineTo(x + l, l)
			context.fill()
		}

		// Sand
		context.fillStyle = '#f5e693'
		context.beginPath()
		context.moveTo(0, sandHeight[0]*this.state.screen.height)
		for (let i = 1; i < sandHeight.length; i++) {
			context.lineTo(this.state.screen.width * i / (sandHeight.length - 1), sandHeight[i]*this.state.screen.height)
		}

		context.lineTo(this.state.screen.width, this.state.screen.height)
		context.lineTo(0, this.state.screen.height)
		context.fill()

		// Plants

	}

	render() {
		const o = {
			a: this.state.orientation.alpha,
			b: this.state.orientation.beta,
			c: this.state.orientation.gamma,
		}

		const a = {
			x: this.state.acceleration.x,
			y: this.state.acceleration.y,
			z: this.state.acceleration.z,
		}

		const spd = {...this.state.speed}
		const pos = {...this.state.position}

		const acc = {
			x: a.x - GRAVITY*Math.sin(o.c),
			y: a.y + GRAVITY*Math.sin(o.b)*Math.cos(o.c),
			z: a.z - GRAVITY*Math.cos(o.b)*Math.cos(o.c),
		}

		// Round for display
		o.a = Math.floor(o.a / Math.PI * 10) / 10
		o.b = Math.floor(o.b / Math.PI * 10) / 10
		o.c = Math.floor(o.c / Math.PI * 10) / 10

		a.x = Math.floor(a.x * 10) / 10
		a.y = Math.floor(a.y * 10) / 10
		a.z = Math.floor(a.z * 10) / 10

		acc.x = Math.floor(acc.x * 10) / 10
		acc.y = Math.floor(acc.y * 10) / 10
		acc.z = Math.floor(acc.z * 10) / 10

		spd.x = Math.floor(spd.x * 10) / 10
		spd.y = Math.floor(spd.y * 10) / 10
		spd.z = Math.floor(spd.z * 10) / 10

		pos.x = Math.floor(pos.x * 10) / 10
		pos.y = Math.floor(pos.y * 10) / 10
		pos.z = Math.floor(pos.z * 10) / 10

		let debug = null

		if (this.state.debug) {
			debug = <div className="debug">
					<p>Orientation: (alpha: {o.a}pi, beta: {o.b}pi, gamma: {o.c}pi)</p>
					<p>Acceleration: (x: {a.x}, y: {a.y}, z: {a.z})</p>
					<p>Acceleration (without gravity): (x: {acc.x}, y: {acc.y}, z: {acc.z})</p>
					<p>Speed: (x: {spd.x}, y: {spd.y}, z: {spd.z})</p>
					<p>Position: (x: {pos.x}, y: {pos.y}, z: {pos.z})</p>
				</div>
		}

		return (
			<div className="App">
				<canvas ref="canvas"
					width={this.state.screen.width * this.state.screen.ratio}
					height={this.state.screen.height * this.state.screen.ratio}
				/>
				<Hud />
				{debug}
			</div>
		);
	}
}

export default App;
