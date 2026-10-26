const FILTER_INDEX = {
  natural: 0,
  beauty: 1,
  glow: 2,
  warm: 3,
  cold: 4,
  vintage: 5,
  mono: 6,
};

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  uniform float u_mirror;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = vec2(
      mix(a_texCoord.x, 1.0 - a_texCoord.x, u_mirror),
      a_texCoord.y
    );
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform int u_filter;
  uniform float u_amount;
  uniform vec2 u_texel;
  uniform vec4 u_face;
  uniform vec2 u_leftEye;
  uniform vec2 u_rightEye;
  uniform vec2 u_mouth;
  varying vec2 v_texCoord;

  vec3 saturation(vec3 color, float value) {
    float lightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(lightness), color, value);
  }

  void addBeautySample(vec2 offset, vec3 center, inout vec3 sum, inout float weightSum) {
    vec3 sampleColor = texture2D(u_image, v_texCoord + offset).rgb;
    vec3 difference = sampleColor - center;
    // Preserve glasses, eyebrows and other high-contrast detail.
    float weight = exp(-dot(difference, difference) / 0.012);
    sum += sampleColor * weight;
    weightSum += weight;
  }

  void main() {
    vec3 color = texture2D(u_image, v_texCoord).rgb;

    if (u_filter == 0) {
      color = (color - 0.5) * (1.0 + u_amount * 0.04) + 0.5;
      color *= 1.0 + u_amount * 0.035;
    } else if (u_filter == 1) {
      vec3 original = color;
      vec2 facePoint = (v_texCoord - u_face.xy) / max(u_face.zw, vec2(0.001));
      float mask = (1.0 - smoothstep(0.60, 1.0, length(facePoint))) * step(0.001, u_face.z);
      vec2 eyeRadius = max(u_face.zw * vec2(0.32, 0.15), vec2(0.001));
      float eyes = min(length((v_texCoord - u_leftEye) / eyeRadius), length((v_texCoord - u_rightEye) / eyeRadius));
      float mouth = length((v_texCoord - u_mouth) / max(u_face.zw * vec2(0.42, 0.18), vec2(0.001)));
      float detailMask = smoothstep(0.6, 1.5, eyes) * smoothstep(0.6, 1.5, mouth);
      vec2 radius = max(u_texel, vec2(u_face.z * 0.027));
      // Keep a circular sampling radius in pixel space on portrait video.
      radius.y = radius.x * u_texel.y / u_texel.x;
      vec3 sum = color;
      float weights = 1.0;
      addBeautySample(vec2(radius.x, 0.0), color, sum, weights);
      addBeautySample(vec2(-radius.x, 0.0), color, sum, weights);
      addBeautySample(vec2(0.0, radius.y), color, sum, weights);
      addBeautySample(vec2(0.0, -radius.y), color, sum, weights);
      addBeautySample(radius * 0.7071, color, sum, weights);
      addBeautySample(-radius * 0.7071, color, sum, weights);
      addBeautySample(vec2(radius.x, -radius.y) * 0.7071, color, sum, weights);
      addBeautySample(vec2(-radius.x, radius.y) * 0.7071, color, sum, weights);
      color = mix(original, sum / weights, u_amount * mask * detailMask * 0.82);
      // A small continuous lift avoids bright patches around excluded features.
      color += color * (1.0 - color) * (0.14 * u_amount * mask);
    } else if (u_filter == 2) {
      color = saturation(color, 1.0 + u_amount * 0.14);
      color = color * (1.0 + u_amount * 0.08) + vec3(u_amount * 0.08);
    } else if (u_filter == 3) {
      color = saturation(color, 1.0 + u_amount * 0.18);
      color += vec3(0.11, 0.035, -0.055) * u_amount;
    } else if (u_filter == 4) {
      color = saturation(color, 1.0 + u_amount * 0.07);
      color += vec3(-0.045, 0.025, 0.105) * u_amount;
    } else if (u_filter == 5) {
      vec3 sepia = vec3(
        dot(color, vec3(0.393, 0.769, 0.189)),
        dot(color, vec3(0.349, 0.686, 0.168)),
        dot(color, vec3(0.272, 0.534, 0.131))
      );
      color = mix(color, sepia, u_amount * 0.62);
      color = saturation(color, 1.0 - u_amount * 0.18);
    } else if (u_filter == 6) {
      float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(color, vec3(gray), u_amount);
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'WebGL shader compilation failed');
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || 'WebGL program linking failed');
  }
  return program;
}

function bindBuffer(gl, location, values) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

export function createStoryFilterRenderer(canvas) {
  try {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return null;

    const program = createProgram(gl);
    gl.useProgram(program);
    const positionBuffer = bindBuffer(gl, gl.getAttribLocation(program, 'a_position'), [
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const textureBuffer = bindBuffer(gl, gl.getAttribLocation(program, 'a_texCoord'), [
      0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1,
    ]);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const filterLocation = gl.getUniformLocation(program, 'u_filter');
    const amountLocation = gl.getUniformLocation(program, 'u_amount');
    const mirrorLocation = gl.getUniformLocation(program, 'u_mirror');
    const texelLocation = gl.getUniformLocation(program, 'u_texel');
    const faceLocation = gl.getUniformLocation(program, 'u_face');
    const leftEyeLocation = gl.getUniformLocation(program, 'u_leftEye');
    const rightEyeLocation = gl.getUniformLocation(program, 'u_rightEye');
    const mouthLocation = gl.getUniformLocation(program, 'u_mouth');

    return {
      render(source, filterId, intensity, mirror, regions = null) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.uniform1i(filterLocation, FILTER_INDEX[filterId] ?? 0);
        gl.uniform1f(amountLocation, Math.min(1, Math.max(0, Number(intensity) || 0)));
        gl.uniform1f(mirrorLocation, mirror ? 1 : 0);
        gl.uniform2f(texelLocation, 1 / canvas.width, 1 / canvas.height);
        gl.uniform4fv(faceLocation, regions?.face || [0, 0, 0, 0]);
        gl.uniform2fv(leftEyeLocation, regions?.leftEye || [0, 0]);
        gl.uniform2fv(rightEyeLocation, regions?.rightEye || [0, 0]);
        gl.uniform2fv(mouthLocation, regions?.mouth || [0, 0]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
      dispose() {
        gl.deleteTexture(texture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(textureBuffer);
        gl.deleteProgram(program);
      },
    };
  } catch (error) {
    console.warn('[story-camera] WebGL filter renderer unavailable', error);
    return null;
  }
}

