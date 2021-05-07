const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 425;

var blurStrength = 10.0;

var canvas = document.createElement('canvas')
canvas.width = CANVAS_WIDTH; //window.innerWidth
canvas.height = CANVAS_HEIGHT; //window.innerHeight
document.body.appendChild(canvas)


var gl = canvas.getContext('webgl')
gl.clearColor(1.0, 1.0, 1.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)


function main() {
	var image = new Image();
	image.crossOrigin = "текстура";

	image.src = "img/city.jpg";
	image.onload = function() {
		render(image);
	}
}

// ЭТА ФУНКЦИЯ СОЗДАЁТ ШЕЙДЕРЫ
function createShader(gl, source, type) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('ERROR ошибка создания шейдера, type=>' + type, gl.getShaderInfoLog(shader));
		return;
	}
	return shader
}


function createBuffer(data) {
	data = data instanceof Float32Array ? data : new Float32Array(data);
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	return buffer;
}


function createProgram(gl, vertexShader, fragmentShader) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		throw ("ОШИБКА createProgram() :" + gl.getProgramInfoLog(program));
	}
	return program;
};

var texture_width = 1,
	texture_height = 1;

function createTexture(image, width, height) {

	var texture = gl.createTexture();

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	width === undefined && height === undefined ?
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image) :
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

	return texture;
}


function render(image) {
	const vertexShaderSource = [
		'attribute vec2 aPosition;',
		'attribute vec2 aUV;',
		'varying vec2 vUV;',
		'void main(){',
		'  gl_Position = vec4(aPosition, 0.0, 1.0);',
		'  vUV = aUV;',
		'}',
	].join("\n");

	const fragShaderSource = `

	  precision mediump float;
	  varying vec2 vUV;
	  uniform sampler2D uTexture;
	  void main(){
		 float brightness = 1.1;

		 gl_FragColor = texture2D(uTexture, vUV);
		 gl_FragColor.rgb *= brightness;

	  }`

	const blurShader = `
		precision mediump float;
		varying vec2 vUV;

		uniform sampler2D uTexture;
	  	uniform vec2 offs_blur;

		//[ 0.0625  0.125  0.0625 ]
		//[ 0.125   0.25   0.125  ]
		//[ 0.0625  0.125  0.0625 ]

		void main(){
			gl_FragColor = vec4(0.0);
			gl_FragColor += texture2D(uTexture, vUV + vec2(-offs_blur.x, -offs_blur.y))*0.0625;
			gl_FragColor += texture2D(uTexture, vUV + vec2(         0.0, -offs_blur.y))*0.125;	
			gl_FragColor += texture2D(uTexture, vUV + vec2( offs_blur.x, -offs_blur.y))*0.0625;

			gl_FragColor += texture2D(uTexture, vUV + vec2(-offs_blur.x,          0.0))*0.125;
			gl_FragColor += texture2D(uTexture, vUV + vec2(         0.0,          0.0))*0.25;	
			gl_FragColor += texture2D(uTexture, vUV + vec2( offs_blur.x,          0.0))*0.125;	


			gl_FragColor += texture2D(uTexture, vUV + vec2(-offs_blur.x, offs_blur.y))*0.0625;
			gl_FragColor += texture2D(uTexture, vUV + vec2(         0.0, offs_blur.y))*0.125;	
			gl_FragColor += texture2D(uTexture, vUV + vec2( offs_blur.x, offs_blur.y))*0.0625;	
	}
	`
	// const fragShaderSource =  [
	//     'precision highp float;',
	//     'varying vec2 vUV;',
	//     'uniform sampler2D texture;',
	//     '',
	//     'void main(void) {',
	//     'vec4 c = texture2D(texture, vUV);',
	//     'gl_FragColor = vec4(1.0 - c.r, 1.0 - c.g, 1.0 - c.b, c.a);',
	//     '}'
	// ].join('\n');
	
	//create vertex shader
	var vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);

	//create fragment shader
	var fragShader = createShader(gl, blurShader, gl.FRAGMENT_SHADER);

	//create program
	var program = createProgram(gl, vertexShader, fragShader);

	aPosition = gl.getAttribLocation(program, "aPosition");
	aUV = gl.getAttribLocation(program, "aUV");
	uTexture = gl.getUniformLocation(program, "uTexture");
	offs_blur = gl.getUniformLocation(program, "offs_blur");


	var buffer = createBuffer([
		// X  Y     U   V
		1.0, 1.0, 1.0, 0.0,
		-1.0, 1.0, 0.0, 0.0,
		1.0, -1.0, 1.0, 1.0,

		1.0, -1.0, 1.0, 1.0,
		-1.0, 1.0, 0.0, 0.0,
		-1.0, -1.0, 0.0, 1.0,
	]);

	texture = createTexture(image);

	gl.useProgram(program);
	gl.uniform1i(uTexture, 0);
	var blur = blurStrength;
	gl.uniform2fv(offs_blur, [blur / image.width, blur / image.height]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

	gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, gl.FALSE, 16, 0);

	gl.vertexAttribPointer(aUV, 2, gl.FLOAT, gl.FALSE, 16, 8);

	gl.enableVertexAttribArray(aPosition);
	gl.enableVertexAttribArray(aUV);

	window.onresize = resize;
	resize();
	requestAnimationFrame(draw);
}

function draw(delteMS) {

	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	requestAnimationFrame(draw);
}

function resize() {
	canvas.width = CANVAS_WIDTH; //window.innerWidth;
	canvas.height = CANVAS_HEIGHT; //window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
}

main();