import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import gsap from "gsap";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10
);

camera.position.z = 5;

const canvas = document.querySelector("canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Post-processing effects
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom effect
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.0, // Intensity
  0.4, // Radius
  0.85 // Threshold
);
composer.addPass(bloomPass);

// Edge outline effect
const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
outlinePass.edgeStrength = 3.0;
outlinePass.edgeGlow = 0.0;
outlinePass.edgeThickness = 1.0;
outlinePass.pulsePeriod = 0;
outlinePass.visibleEdgeColor.set('#ffffff');
outlinePass.hiddenEdgeColor.set('#190a05');
outlinePass.enabled = false;
composer.addPass(outlinePass);

// Cartoon effect shader
const toonShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.1 },
    contrast: { value: 0.3 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb += brightness;
      color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;
      
      // Quantize colors to create cartoon effect
      float steps = 5.0;
      color.rgb = floor(color.rgb * steps) / steps;
      
      gl_FragColor = color;
    }
  `
};

const toonPass = new ShaderPass(toonShader);
toonPass.enabled = false;
composer.addPass(toonPass);

// X-ray effect shader
const xrayShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 0.6 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float opacity;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Convert to grayscale and add transparency
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 grayColor = vec3(gray);
      
      // Add blue tint
      vec3 blueXray = mix(grayColor, vec3(0.3, 0.6, 1.0), 0.7);
      
      gl_FragColor = vec4(blueXray, color.a * opacity);
    }
  `
};

const xrayPass = new ShaderPass(xrayShader);
xrayPass.enabled = false;
composer.addPass(xrayPass);

// Responsive adjustment
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Create orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true; // Allow panning
controls.minDistance = 1;
controls.maxDistance = 10;
controls.enableRotate = true;
controls.rotateSpeed = 1.5; // Increase rotation speed for more sensitive rotation
controls.enabled = false; // Disabled by default, enabled when viewing model page
controls.autoRotate = false; // No auto-rotation by default
controls.autoRotateSpeed = 5.0; // Set auto-rotation speed

// Add controls state indicator
let controlsState = {
  isDragging: false,
  isRotating: false
};

// Mouse control event listeners
renderer.domElement.addEventListener('mousedown', () => {
  if (controls.enabled) {
    controlsState.isDragging = true;
    
    // Only show tip when on model page
    const modelPage = document.getElementById("model-page");
    if (modelPage && modelPage.classList.contains('hidden') === false) {
      console.log('Started rotating model');
    }
  }
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (controls.enabled && controlsState.isDragging) {
    controlsState.isRotating = true;
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  if (controls.enabled) {
    controlsState.isDragging = false;
    controlsState.isRotating = false;
  }
});

// Lighting setup
// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Main light source - directional light
const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(5, 5, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
scene.add(mainLight);

// Spotlight
const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(0, 5, 0);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.3;
spotLight.castShadow = true;
spotLight.visible = false;
scene.add(spotLight);

// Load HDRI environment map
const hdri = new RGBELoader();
hdri.load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
  }
);

// Audio loader and sound effects
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Flatten can sound effect
const flattenSound = new THREE.Audio(audioListener);
const flattenAudioLoader = new THREE.AudioLoader();
flattenAudioLoader.load(
  '/sound/crunch.wav', // Use local resource
  function(buffer) {
    flattenSound.setBuffer(buffer);
    flattenSound.setVolume(0.5);
  }
);

// Add open lid sound effect
const openLidSound = new THREE.Audio(audioListener);
const openLidAudioLoader = new THREE.AudioLoader();
openLidAudioLoader.load(
  '/sound/y2148.wav', // Use local resource
  function(buffer) {
    openLidSound.setBuffer(buffer);
    openLidSound.setVolume(0.5);
  }
);

// Model loader
const loader = new GLTFLoader();

// Add JSON model loader
const jsonLoader = new THREE.ObjectLoader();

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Load and configure texture function, ensure texture parameters are set correctly
function loadTexture(path) {
  const texture = textureLoader.load(path);
  texture.flipY = false; // Disable Y-axis flipping to match 3D model UV mapping
  texture.encoding = THREE.sRGBEncoding; // Use correct color encoding
  texture.wrapS = THREE.RepeatWrapping; // Horizontal repeat
  texture.wrapT = THREE.RepeatWrapping; // Vertical repeat
  return texture;
}

// Use new loading function to preload textures
const colaTexture = loadTexture('/model/cococola/textures/cola.png');
const fandaTexture = loadTexture('/model/fanda/textures/fanda.jpeg');
const spriteTexture = loadTexture('/model/sprite/sprite.jpg'); // Add sprite texture

// Currently loaded model
let currentModel = null;
let currentModelType = null;
const axis = new THREE.Vector3(0, 0.5, 0);

// Animation timeline
const tl = gsap.timeline();

// Define open lid function
function openLid() {
  if (!currentModel) return;
  
  console.log(`Trying to open ${currentModelType} model's lid/tab`);
  console.log('Current model type:', currentModelType);
  
  // Record all mesh objects to help find lid/tab part
  console.log('All mesh objects in the model:');
  let allMeshes = [];
  currentModel.traverse((child) => {
    if (child.isMesh) {
      console.log(`- Mesh: ${child.name}, Original name: ${child.originalName || 'Unknown'}`);
      allMeshes.push(child);
    }
  });
  
  // Use different search strategies for different model types
  let lidMesh = null;
  let lidHolderRingMesh = null; // Add variable to record lid holder ring part
  let innerShapeMesh = null; // Add variable to record inner_shape component
  
  if (currentModelType === "cococola" || currentModelType === "fanda" || currentModelType === "real") {
    // Fanta model, Sprite model and Classic Cola model - search for tab part (all JSON format)
    currentModel.traverse((child) => {
      if (child.isMesh) {
        // Find main tab
        if (child.name === "Lid" || 
            child.originalName === "Lid" || 
            child.name.includes("lid") || 
            child.name.includes("Lid") || 
            (child.originalName && child.originalName.includes("Lid")) ||
            (child.originalName && child.originalName.includes("lid"))) {
          lidMesh = child;
          console.log('Found tab:', child.name, 'Original name:', child.originalName);
        }
        
        // Find tab holder ring part
        if (child.name === "lid_holder_ring" || 
            child.originalName === "lid_holder_ring" ||
            (child.name && child.name.toLowerCase().includes("holder")) ||
            (child.originalName && child.originalName.toLowerCase().includes("holder"))) {
          lidHolderRingMesh = child;
          console.log('Found tab holder ring:', child.name, 'Original name:', child.originalName);
        }
        
        // Find inner_shape component
        if (child.name === "inner_shape" || 
            child.originalName === "inner_shape" ||
            (child.name && child.name.toLowerCase().includes("inner")) ||
            (child.originalName && child.originalName.toLowerCase().includes("inner"))) {
          innerShapeMesh = child;
          console.log('Found inner_shape:', child.name, 'Original name:', child.originalName);
        }
      }
    });
  } else {
    // Other models - search for cap part
    currentModel.traverse((child) => {
      if (child.isMesh && 
         (child.name.toLowerCase().includes('cap') || 
          child.name.toLowerCase().includes('lid') || 
          child.name.toLowerCase().includes('top') ||
          (child.originalName && child.originalName.toLowerCase().includes('cap')) ||
          (child.originalName && child.originalName.toLowerCase().includes('lid')) ||
          (child.originalName && child.originalName.toLowerCase().includes('top')))) {
        lidMesh = child;
        console.log('Found cap:', child.name, 'Original name:', child.originalName);
      }
    });
  }
  
  if (lidMesh) {
    console.log('Starting cap/tab animation');
    
    // Get the center point of the cap/tab as the rotation center
    const lidCenter = new THREE.Vector3();
    lidMesh.getWorldPosition(lidCenter);
    console.log('Cap/tab center point:', lidCenter);
    
    // Save original position and rotation
    const originalPosition = lidMesh.position.clone();
    const originalRotation = lidMesh.rotation.clone();
    console.log('Original position:', originalPosition);
    console.log('Original rotation:', originalRotation);
    
    gsap.to(lidMesh.rotation, {
      x: Math.PI/3,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        console.log('Rotation update:', lidMesh.rotation.x, lidMesh.rotation.y, lidMesh.rotation.z);
      },
      onComplete: () => {
        console.log('Rotation animation complete');
        
        if (lidHolderRingMesh) {
          console.log('Make tab holder ring disappear');
          lidHolderRingMesh.visible = false;
        }
        
        if (innerShapeMesh) {
          console.log('Make inner_shape disappear');
          innerShapeMesh.visible = false;
        }
      }
    });
    
    gsap.to(lidMesh.position, {
      y: originalPosition.y + 0.2,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        console.log('Position update:', lidMesh.position.y);
      },
      onComplete: () => {
        console.log('Position animation complete');
      }
    });
    
    // Play open cap sound effect
    if (openLidSound.isPlaying) {
      openLidSound.stop();
    }
    openLidSound.play();
  } else {
    console.warn('Tab/cap part not found, trying to find possible related parts');
    const possibleRelatedParts = allMeshes.filter(mesh => 
      mesh.name.toLowerCase().includes('top') || 
      (mesh.originalName && mesh.originalName.toLowerCase().includes('top')) ||
      mesh.name.toLowerCase().includes('cap') || 
      (mesh.originalName && mesh.originalName.toLowerCase().includes('cap')) ||
      mesh.name.toLowerCase().includes('open') || 
      (mesh.originalName && mesh.originalName.toLowerCase().includes('open')));
    
    if (possibleRelatedParts.length > 0) {
      console.log('Found possible related parts:');
      possibleRelatedParts.forEach(part => {
        console.log(`- ${part.name}, Original name: ${part.originalName || 'Unknown'}`);
      });
      
      // Try using the first related part found
      const firstPart = possibleRelatedParts[0];
      console.log('Trying to use:', firstPart.name);
      
      // Use GSAP to create rotation animation
      gsap.to(firstPart.rotation, {
        x: Math.PI/3,
        duration: 0.8,
        ease: "power2.out"
      });
      
      // Move upwards
      gsap.to(firstPart.position, {
        y: firstPart.position.y + 0.2,
        duration: 0.8,
        ease: "power2.out"
      });
      
      // Play open cap sound effect
      if (openLidSound.isPlaying) {
        openLidSound.stop();
      }
      openLidSound.play();
    } else {
      console.error('Could not find any parts possibly related to tab/cap');
    }
  }
}

// Model path configuration and description
const modelPaths = {
  real: {
    path: "/model/cococola/source/cola.json",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    name: "Classic Coca-Cola",
    description: "Classic Coca-Cola bottle with classic curved design and iconic Coca-Cola trademark on the bottle. This design continues the brand's traditional style, giving a familiar and friendly feeling.",
    texture: colaTexture,
    scale: [0.015, 0.015, 0.015],
    type: "json"
  },
  fanda: {
    path: "/model/sprite/sprite.json", 
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    name: "Sprite Series",
    description: "Sprite Series beverage with refreshing lemon flavor and unique green bottle design. This product uses new materials and craftsmanship, presenting a more youthful and energetic visual effect that is popular among young consumers.",  // Updated description
    texture: spriteTexture,
    scale: [0.015, 0.015, 0.015],
    type: "json"
  },
  cococola: {
    path: "/model/fanda/source/250ml_Can_Label.json",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    name: "Fanta Series",
    description: "Fanta Series beverage with bright colors and unique bottle design. This product uses new materials and craftsmanship, presenting a more youthful and energetic visual effect that is popular among young consumers.",
    texture: fandaTexture,
    scale: [0.015, 0.015, 0.015],
    type: "json"
  }
};

// Camera preset views
const cameraViews = {
  front: { position: [0, 0, 3], target: [0, 0, 0] },  // Reduce z value to bring camera closer
  back: { position: [0, 0, -3], target: [0, 0, 0] },  // Reduce z value to bring camera closer
  top: { position: [0, 3, 0], target: [0, 0, 0] },    // Reduce y value to bring camera closer
  bottom: { position: [0, -3, 0], target: [0, 0, 0] } // Reduce y value to bring camera closer
};

// Material presets
const materialPresets = {
  default: {},
  wireframe: { wireframe: true, color: 0xff0000 },
  shiny: { metalness: 1.0, roughness: 0.2 },
  matte: { metalness: 0.0, roughness: 1.0 }
};

// Effect presets
const effectPresets = {
  none: function() {
    bloomPass.enabled = false;
    outlinePass.enabled = false;
    toonPass.enabled = false;
    xrayPass.enabled = false;
  },
  glow: function() {
    bloomPass.enabled = true;
    bloomPass.strength = 1.5;
    outlinePass.enabled = false;
    toonPass.enabled = false;
    xrayPass.enabled = false;
  },
  toon: function() {
    bloomPass.enabled = false;
    outlinePass.enabled = true;
    toonPass.enabled = true;
    xrayPass.enabled = false;
  },
  xray: function() {
    bloomPass.enabled = false;
    outlinePass.enabled = false;
    toonPass.enabled = false;
    xrayPass.enabled = true;
  }
};

// Page reference variable declaration
let homePage, productsPage, modelPage, realModelPage, fandaModelPage, cococolaModelPage;
let aboutPage, contactPage;
let homeLink, productsLink, aboutLink, contactLink;
let backToProductsFromRealBtn, backToProductsFromFandaBtn, backToProductsFromCococolaBtn;
let backToHomeBtn, backToHomeFromContactBtn;

// Helper function: Load and display the specified model type
function loadAndShowModel(modelType) {
    currentModelType = modelType;
    
    // Hide home page and products page
    homePage.classList.add("hidden");
    homePage.classList.remove("flex");
    productsPage.classList.add("hidden");
    productsPage.classList.remove("flex");
    aboutPage.classList.add("hidden");
    
    // Show corresponding model page
    const modelPages = {
        "real": realModelPage,
        "fanda": fandaModelPage,
        "cococola": cococolaModelPage
    };
    
    if (modelPages[modelType]) {
        modelPages[modelType].classList.remove("hidden");
        loadModel(modelType);
    }
}

// Page navigation functions
function showHomePage() {
  console.log("Executing show home page function");
  homePage.classList.remove("hidden");
  homePage.classList.add("flex");
  productsPage.classList.add("hidden");
  productsPage.classList.remove("flex");
  realModelPage.classList.add("hidden");
  fandaModelPage.classList.add("hidden");
  cococolaModelPage.classList.add("hidden");
  modelPage.classList.add("hidden");
  aboutPage.classList.add("hidden");
  contactPage.classList.add("hidden");
  
  // Clear current model
  removeCurrentModel();
  
  // Disable orbit controls
  controls.enabled = false;
}

function showProductsPage() {
  console.log("Executing show products page function");
  homePage.classList.add("hidden");
  homePage.classList.remove("flex");
  productsPage.classList.remove("hidden");
  productsPage.classList.add("flex");
  realModelPage.classList.add("hidden");
  fandaModelPage.classList.add("hidden");
  cococolaModelPage.classList.add("hidden");
  modelPage.classList.add("hidden");
  aboutPage.classList.add("hidden");
  contactPage.classList.add("hidden");
  
  // Clear current model
  removeCurrentModel();
  
  // Disable orbit controls
  controls.enabled = false;
}

function showModelDetailPage(modelType) {
  console.log("Executing show model detail page function: " + modelType);
  homePage.classList.add("hidden");
  homePage.classList.remove("flex");
  productsPage.classList.add("hidden");
  productsPage.classList.remove("flex");
  modelPage.classList.add("hidden");
  aboutPage.classList.add("hidden");
  contactPage.classList.add("hidden");
  
  // Show corresponding detail page based on model type
  if(modelType === "real") {
    realModelPage.classList.remove("hidden");
    fandaModelPage.classList.add("hidden");
    cococolaModelPage.classList.add("hidden");
  } else if(modelType === "fanda") {
    realModelPage.classList.add("hidden");
    fandaModelPage.classList.remove("hidden");
    cococolaModelPage.classList.add("hidden");
  } else if(modelType === "cococola") {
    realModelPage.classList.add("hidden");
    fandaModelPage.classList.add("hidden");
    cococolaModelPage.classList.remove("hidden");
  }
  
  // Enable orbit controls and set to active state
  controls.enabled = true;
  controls.enableRotate = true;
  
  // Reset controls
  controls.reset();
  
  // Reset effects
  setEffect("none");
  
  // Ensure camera position is correct
  camera.position.set(0, 0, 5);
  controls.update();
  
  // Show operation tip
  setTimeout(() => {
    console.log('Tip: Hold left mouse button and drag to rotate and view the model from different angles');
  }, 1000);
}

function showAboutPage() {
  console.log("Executing show about page function");
  homePage.classList.add("hidden");
  homePage.classList.remove("flex");
  productsPage.classList.add("hidden");
  productsPage.classList.remove("flex");
  realModelPage.classList.add("hidden");
  fandaModelPage.classList.add("hidden");
  cococolaModelPage.classList.add("hidden");
  modelPage.classList.add("hidden");
  aboutPage.classList.remove("hidden");
  contactPage.classList.add("hidden");
  
  // Clear current model
  removeCurrentModel();
  
  // Disable orbit controls
  controls.enabled = false;
}

function showContactPage() {
  console.log("Executing show contact page function");
  homePage.classList.add("hidden");
  homePage.classList.remove("flex");
  productsPage.classList.add("hidden");
  productsPage.classList.remove("flex");
  realModelPage.classList.add("hidden");
  fandaModelPage.classList.add("hidden");
  cococolaModelPage.classList.add("hidden");
  modelPage.classList.add("hidden");
  aboutPage.classList.add("hidden");
  contactPage.classList.remove("hidden");
  
  // Clear current model
  removeCurrentModel();
  
  // Disable orbit controls
  controls.enabled = false;
}

// Set camera view
function setCameraView(viewName) {
  if (!cameraViews[viewName]) return;
  
  const view = cameraViews[viewName];
  
  // Use GSAP animation to move camera
  gsap.to(camera.position, {
    x: view.position[0],
    y: view.position[1],
    z: view.position[2],
    duration: 1,
    ease: "power2.inOut",
    onUpdate: function() {
      // Ensure camera always looks at target point
      camera.lookAt(new THREE.Vector3(...view.target));
      controls.update();
    },
    onComplete: function() {
      // After completion, ensure model fits the view
      centerModel();
    }
  });
}

// Set material
function setMaterial(presetName) {
  if (!currentModel || !materialPresets[presetName]) return;
  
  const preset = materialPresets[presetName];
  
  currentModel.traverse((child) => {
    if (child.isMesh && child.material) {
      // Save original material properties (if not already saved)
      if (!child.originalMaterial) {
        // Store all important material properties, including texture
        child.originalMaterial = {
          wireframe: child.material.wireframe,
          metalness: child.material.metalness,
          roughness: child.material.roughness,
          color: child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff),
          map: child.material.map  // Save texture reference
        };
      }
      
      // Apply new material
      if (presetName === "default") {
        // Restore original material but keep current texture unchanged
        if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            // Ensure it's a PBR material
            child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
            
            // Restore default values
            child.material[i].wireframe = child.originalMaterial.wireframe;
            if (child.material[i].metalness !== undefined) {
              child.material[i].metalness = 0.5; // Default metalness
            }
            if (child.material[i].roughness !== undefined) {
              child.material[i].roughness = 0.5; // Default roughness
            }
            child.material[i].needsUpdate = true;
          }
        } else {
          // Ensure it's a PBR material
          child.material = upgradeMaterialIfNeeded(child.material);
          
          // Restore default values
          child.material.wireframe = child.originalMaterial.wireframe;
          if (child.material.metalness !== undefined) {
            child.material.metalness = 0.5; // Default metalness
          }
          if (child.material.roughness !== undefined) {
            child.material.roughness = 0.5; // Default roughness
          }
          child.material.needsUpdate = true;
        }
      } else {
        // Apply preset but keep current texture unchanged
        if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            // Ensure it's a PBR material
            child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
            
            // Apply preset values
            if (preset.wireframe !== undefined) {
              child.material[i].wireframe = preset.wireframe;
            }
            if (preset.metalness !== undefined && child.material[i].metalness !== undefined) {
              child.material[i].metalness = preset.metalness;
            }
            if (preset.roughness !== undefined && child.material[i].roughness !== undefined) {
              child.material[i].roughness = preset.roughness;
            }
            if (preset.color) {
              child.material[i].color.set(preset.color);
            }
            child.material[i].needsUpdate = true;
          }
        } else {
          // Ensure it's a PBR material
          child.material = upgradeMaterialIfNeeded(child.material);
          
          // Apply preset values
          if (preset.wireframe !== undefined) {
            child.material.wireframe = preset.wireframe;
          }
          if (preset.metalness !== undefined && child.material.metalness !== undefined) {
            child.material.metalness = preset.metalness;
          }
          if (preset.roughness !== undefined && child.material.roughness !== undefined) {
            child.material.roughness = preset.roughness;
          }
          if (preset.color) {
            child.material.color.set(preset.color);
          }
          child.material.needsUpdate = true;
        }
      }
      
      // Ensure texture remains unchanged
      if (modelPaths[currentModelType] && modelPaths[currentModelType].texture) {
        // Ensure model still uses the current model type's texture
        if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            child.material[i].map = modelPaths[currentModelType].texture;
          }
        } else {
          child.material.map = modelPaths[currentModelType].texture;
        }
      }
    }
  });
}

// Set effect
function setEffect(effectName) {
  if (!effectPresets[effectName]) return;
  effectPresets[effectName]();
}

// Remove current model
function removeCurrentModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
}

// Empty function, no longer load home model
function loadHomeModel() {
  // Clear any previously existing model
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  
  console.log("Home page model has been disabled");
}

// Load specified model
function loadModel(modelType) {
  removeCurrentModel();
  currentModelType = modelType;
  
  const modelConfig = modelPaths[modelType];
  console.log(`Starting to load ${modelType} model:`, modelConfig.path);
  
  if (modelConfig.type === "json") {
    // Use JSON loader to load model
    fetch(modelConfig.path)
      .then(response => response.json())
      .then(json => {
        currentModel = jsonLoader.parse(json);
        console.log(`JSON model ${modelType} loaded successfully, object type:`, currentModel.type);
        
        // Debug model structure
        console.log('JSON model hierarchy:');
        let meshCount = 0;
        currentModel.traverse(node => {
          if (node.isMesh) {
            meshCount++;
            console.log(`Mesh: ${node.name}, Position: x=${node.position.x}, y=${node.position.y}, z=${node.position.z}`);
            if (node.material) {
              console.log(`  Material type: ${Array.isArray(node.material) ? 'Array' : 'Single'}`);
            }
          }
        });
        console.log(`JSON model has ${meshCount} mesh objects`);
        
        // Set position, rotation and scale
        currentModel.position.set(...modelConfig.position);
        currentModel.rotation.set(...modelConfig.rotation);
        
        // Apply scale
        if (modelConfig.scale) {
          currentModel.scale.set(...modelConfig.scale);
        }
        
        // Apply custom texture
        applyCustomTexture(currentModel, modelConfig.texture);
        
        // Set shadows
        currentModel.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Add to outline effect
        outlinePass.selectedObjects = [currentModel];
        
        // Reset camera and controls
        camera.position.set(0, 0, 5);
        controls.target.set(0, 0, 0);
        controls.enabled = true;
        controls.enableRotate = true;
        controls.update();
        
        scene.add(currentModel);
        
        // Use GSAP animation to show model
        gsap.from(currentModel.position, {
          y: 1,
          duration: 1,
        });
        
        gsap.to(currentModel.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          onComplete: () => {
            controls.enabled = true;
            controls.update();
            centerModel();
          }
        });
      })
      .catch(error => {
        console.error("Error loading JSON model:", error);
      });
  } else {
    // Use GLTF loader to load model
    loader.load(
      modelConfig.path,
      (gltf) => {
        currentModel = gltf.scene;
        console.log(`Model ${modelType} loaded successfully, number of child objects:`, currentModel.children.length);
        
        // Debug model structure
        console.log('Model hierarchy:');
        let meshCount = 0;
        currentModel.traverse(node => {
          if (node.isMesh) {
            meshCount++;
            console.log(`Mesh: ${node.name}, Position: x=${node.position.x}, y=${node.position.y}, z=${node.position.z}`);
            console.log(`  Material type: ${Array.isArray(node.material) ? 'Array' : 'Single'}`);
            if (node.material) {
              if (Array.isArray(node.material)) {
                console.log(`  Number of materials: ${node.material.length}`);
              } else {
                console.log(`  Material map: ${node.material.map ? 'Exists' : 'Does not exist'}`);
              }
            }
          }
        });
        console.log(`Model has ${meshCount} mesh objects`);
        
        currentModel.position.set(...modelConfig.position);
        currentModel.rotation.set(...modelConfig.rotation);
        
        // Apply scale
        if (modelConfig.scale) {
          currentModel.scale.set(...modelConfig.scale);
        }
        
        // Apply custom texture
        applyCustomTexture(currentModel, modelConfig.texture);
        
        // Set shadows
        currentModel.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Add to outline effect
        outlinePass.selectedObjects = [currentModel];
        
        // Reset camera and controls
        camera.position.set(0, 0, 5);
        controls.target.set(0, 0, 0);
        controls.enabled = true;
        controls.enableRotate = true;
        controls.update();
        
        scene.add(currentModel);
        
        // Use GSAP animation to show model
        gsap.from(currentModel.position, {
          y: 1,
          duration: 1,
        });
        
        gsap.to(currentModel.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          onComplete: () => {
            controls.enabled = true;
            controls.update();
            centerModel();
          }
        });
      },
      (progress) => {
        console.log(`Model loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error("Error loading model:", error);
      }
    );
  }
}

// Ensure model is centered in view
function centerModel() {
  if (!currentModel) return;
  
  // Calculate model bounding box
  const boundingBox = new THREE.Box3().setFromObject(currentModel);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  
  // Calculate appropriate camera distance
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  
  // Slightly increase distance to ensure full visibility
  distance = distance * 1.2; // Reduce multiplier to show larger model
  
  // Maintain current camera direction, only adjust distance
  const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  camera.position.copy(center).add(currentDir.multiplyScalar(distance));
  
  // Set controls target point to model center
  controls.target.copy(center);
  
  // Update controls
  controls.update();
}

// Apply custom texture to model
function applyCustomTexture(model, texture) {
  if (!texture) {
    console.error('Texture application failed: No texture provided');
    return;
  }
  
  console.log('Starting to apply texture, current model type:', currentModelType);
  
  // Set texture parameters
  THREE.ColorManagement.enabled = true; // Use new color management
  texture.flipY = false; // Usually 3D model textures don't need Y-axis flipping
  
  // Special handling for Fanta model
  if (currentModelType === 'cococola' && modelPaths[currentModelType].type === 'json') {
    console.log('Special texture handling for Fanta model');
    
    // Print model's child object structure for debugging
    console.log('Number of child objects in Fanta model:', model.children.length);
    model.children.forEach((child, index) => {
      console.log(`Child object ${index}:`, child.name, child.type);
    });
    
    // Try to force apply texture to all possible materials
    model.traverse((child) => {
      if (child.isMesh) {
        console.log('Processing mesh:', child.name);
        
        // Save original material properties
        if (!child.originalMap) {
          if (child.material && child.material.map) {
            child.originalMap = child.material.map;
            console.log('Save original texture:', child.originalMap);
          } else {
            console.log('This mesh has no original texture');
          }
        }
        
        // Process material
        if (child.material) {
          // If array material
          if (Array.isArray(child.material)) {
            console.log('This mesh has multiple materials');
            for (let i = 0; i < child.material.length; i++) {
              console.log(`Setting texture for material ${i}`);
              // Ensure material can support PBR features
              child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
              child.material[i].map = texture;
              // Ensure texture displays correctly
              child.material[i].needsUpdate = true;
              child.material[i].transparent = false;
              child.material[i].opacity = 1.0;
              child.material[i].side = THREE.DoubleSide;
              // Check and fix missing vertex shaders
              ensureNormalsAndUVs(child);
            }
          } else {
            // Single material
            console.log('This mesh has a single material');
            // Ensure material can support PBR features
            child.material = upgradeMaterialIfNeeded(child.material);
            child.material.map = texture;
            // Ensure texture displays correctly
            child.material.needsUpdate = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.side = THREE.DoubleSide;
            // Check and fix missing vertex shaders
            ensureNormalsAndUVs(child);
          }
        } else {
          console.log('This mesh has no material');
        }
      }
    });
    
    return;
  }
  
  // Special handling for Sprite model
  if (currentModelType === 'fanda' && modelPaths[currentModelType].type === 'json') {
    console.log('Special texture handling for Sprite model');
    
    console.log('Number of child objects in Sprite model:', model.children.length);
    model.children.forEach((child, index) => {
      console.log(`Child object ${index}:`, child.name, child.type);
    });
    
    // Ensure using Sprite texture
    const spriteTexture = modelPaths[currentModelType].texture;
    console.log('Using Sprite texture:', spriteTexture);
    
    // Force apply Sprite texture to all meshes
    model.traverse((child) => {
      if (child.isMesh) {
        console.log('Processing Sprite mesh:', child.name);
        
        // Save original material properties
        if (!child.originalMap) {
          if (child.material && child.material.map) {
            child.originalMap = child.material.map;
            console.log('Save Sprite original texture:', child.originalMap);
          } else {
            console.log('This Sprite mesh has no original texture');
          }
        }
        
        // Process material
        if (child.material) {
          // If array material
          if (Array.isArray(child.material)) {
            console.log('This Sprite mesh has multiple materials');
            for (let i = 0; i < child.material.length; i++) {
              console.log(`Setting Sprite material ${i} texture`);
              // Ensure material can support PBR features
              child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
              child.material[i].map = spriteTexture;
              // Ensure texture displays correctly
              child.material[i].needsUpdate = true;
              child.material[i].transparent = false;
              child.material[i].opacity = 1.0;
              child.material[i].side = THREE.DoubleSide;
              // Check and fix missing vertex shaders
              ensureNormalsAndUVs(child);
            }
          } else {
            // Single material
            console.log('This Sprite mesh has a single material');
            // Ensure material can support PBR features
            child.material = upgradeMaterialIfNeeded(child.material);
            child.material.map = spriteTexture;
            // Ensure texture displays correctly
            child.material.needsUpdate = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.side = THREE.DoubleSide;
            // Check and fix missing vertex shaders
            ensureNormalsAndUVs(child);
          }
        } else {
          console.log('This Sprite mesh has no material');
        }
      }
    });
    
    return;
  }
  
  // Special handling for Classic Cola model
  if (currentModelType === 'real' && modelPaths[currentModelType].type === 'json') {
    console.log('Special texture handling for Classic Cola model');
    
    console.log('Number of child objects in Classic Cola model:', model.children.length);
    model.children.forEach((child, index) => {
      console.log(`Child object ${index}:`, child.name, child.type);
    });
    
    // Ensure using Cola texture
    const colaTexture = modelPaths[currentModelType].texture;
    console.log('Using Cola texture:', colaTexture);
    
    // Force apply Cola texture to all meshes
    model.traverse((child) => {
      if (child.isMesh) {
        console.log('Processing Cola mesh:', child.name);
        
        // Save original material properties
        if (!child.originalMap) {
          if (child.material && child.material.map) {
            child.originalMap = child.material.map;
            console.log('Save Cola original texture:', child.originalMap);
          } else {
            console.log('This Cola mesh has no original texture');
          }
        }
        
        // Process material
        if (child.material) {
          // If array material
          if (Array.isArray(child.material)) {
            console.log('This Cola mesh has multiple materials');
            for (let i = 0; i < child.material.length; i++) {
              console.log(`Setting Cola material ${i} texture`);
              // Ensure material can support PBR features
              child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
              child.material[i].map = colaTexture;
              // Ensure texture displays correctly
              child.material[i].needsUpdate = true;
              child.material[i].transparent = false;
              child.material[i].opacity = 1.0;
              child.material[i].side = THREE.DoubleSide;
              // Check and fix missing vertex shaders
              ensureNormalsAndUVs(child);
            }
          } else {
            // Single material
            console.log('This Cola mesh has a single material');
            // Ensure material can support PBR features
            child.material = upgradeMaterialIfNeeded(child.material);
            child.material.map = colaTexture;
            // Ensure texture displays correctly
            child.material.needsUpdate = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.side = THREE.DoubleSide;
            // Check and fix missing vertex shaders
            ensureNormalsAndUVs(child);
          }
        } else {
          console.log('This Cola mesh has no material');
        }
      }
    });
    
    return;
  }
  
  // Standard texture application logic
  let textureApplied = false;
  
  // Traverse all meshes in the model, apply texture
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      // Save original material properties
      if (!child.originalMap) {
        child.originalMap = child.material.map;
      }
      
      // If array material
      if (Array.isArray(child.material)) {
        for (let i = 0; i < child.material.length; i++) {
          // Ensure material can support PBR features and apply texture - even if no map property
          child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
          child.material[i].map = texture;
          // Ensure texture displays correctly
          child.material[i].needsUpdate = true;
          child.material[i].transparent = false;
          child.material[i].opacity = 1.0;
          child.material[i].side = THREE.DoubleSide;
          textureApplied = true;
          console.log(`Applied texture to: ${child.name} (array material ${i})`);
          // Check and fix missing vertex shaders
          ensureNormalsAndUVs(child);
        }
      } else {
        // Single material - apply even if no map property
        child.material = upgradeMaterialIfNeeded(child.material);
        child.material.map = texture;
        // Ensure texture displays correctly
        child.material.needsUpdate = true;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.side = THREE.DoubleSide;
        textureApplied = true;
        console.log(`Applied texture to: ${child.name} (single material)`);
        // Check and fix missing vertex shaders
        ensureNormalsAndUVs(child);
      }
    }
  });
  
  if (!textureApplied) {
    console.warn('No materials found to apply texture, trying deeper search for meshes');
    
    // More thorough search for mesh components
    model.traverse((child) => {
      // Check if it's an object with geometry, even if not a standard Mesh
      if (child.geometry || (child.type && child.type.toLowerCase().includes('mesh'))) {
        console.log(`Found potential mesh object: ${child.name || 'unnamed'}, Type: ${child.type || 'unknown'}`);
        
        // If no material, create one
        if (!child.material) {
          console.log('Creating new material');
          child.material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.5
          });
        } else if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            child.material[i] = upgradeMaterialIfNeeded(child.material[i]);
            child.material[i].map = texture;
            child.material[i].needsUpdate = true;
            child.material[i].transparent = false;
            child.material[i].opacity = 1.0;
            child.material[i].side = THREE.DoubleSide;
          }
        } else {
          child.material = upgradeMaterialIfNeeded(child.material);
          child.material.map = texture;
          child.material.needsUpdate = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.side = THREE.DoubleSide;
        }
        
        // Check and fix mesh data
        ensureNormalsAndUVs(child);
        
        console.log(`Forced texture application to: ${child.name || 'unnamed'}`);
      }
    });
  }
}

// Upgrade material to ensure PBR features
function upgradeMaterialIfNeeded(material) {
  // If current material doesn't support PBR features, convert it to MeshStandardMaterial
  if (material.type !== 'MeshStandardMaterial' && material.type !== 'MeshPhysicalMaterial') {
    console.log(`Upgrading material from ${material.type} to MeshStandardMaterial`);
    
    try {
      // Create new PBR material - using safer method
      const newMaterial = new THREE.MeshStandardMaterial({
        color: material.color ? material.color.clone() : new THREE.Color(0xffffff),
        map: material.map || null,
        transparent: false, // Force disable transparency to avoid top and bottom transparency issues
        opacity: 1.0, // Set opacity to maximum
        side: THREE.DoubleSide, // Enable double-sided rendering to ensure back faces display correctly
        // Default PBR parameters
        metalness: 0.5,
        roughness: 0.5
      });
      
      // Safely copy other common properties
      if (material.emissive && material.emissive.isColor) 
        newMaterial.emissive = material.emissive.clone();
      
      if (material.emissiveMap) 
        newMaterial.emissiveMap = material.emissiveMap;
      
      if (material.normalMap) 
        newMaterial.normalMap = material.normalMap;
      
      if (material.aoMap) 
        newMaterial.aoMap = material.aoMap;
      
      if (material.alphaMap) 
        newMaterial.alphaMap = material.alphaMap;
      
      if (material.wireframe !== undefined)
        newMaterial.wireframe = Boolean(material.wireframe);
      
      if (material.flatShading !== undefined)
        newMaterial.flatShading = Boolean(material.flatShading);
      
      // Ensure material can display texture correctly
      if (newMaterial.map) {
        // Disable transparency-related settings
        newMaterial.transparent = false;
        newMaterial.opacity = 1.0;
        // Ensure both sides are rendered
        newMaterial.side = THREE.DoubleSide;
        // Set appropriate UV mapping mode
        newMaterial.map.wrapS = THREE.RepeatWrapping;
        newMaterial.map.wrapT = THREE.RepeatWrapping;
      }
      
      // Return new material directly, abandon modifying original to avoid property deletion errors
      return newMaterial;
    } catch (error) {
      console.error('Material upgrade failed:', error);
      // If upgrade fails, return original material
      return material;
    }
  } else {
    // Even if already a PBR material, ensure correct settings
    material.transparent = false;
    material.opacity = 1.0;
    material.side = THREE.DoubleSide;
    
    if (material.map) {
      material.map.wrapS = THREE.RepeatWrapping;
      material.map.wrapT = THREE.RepeatWrapping;
    }
    
    // If already a PBR material, return original material
    return material;
  }
}

// Flatten bottle function
function flattenBottle() {
  if (!currentModel) return;
  
  // Play sound effect
  if (flattenSound.isPlaying) {
    flattenSound.stop();
  }
  flattenSound.play();
  
  if (currentModelType === 'cococola' || currentModelType === 'fanda' || currentModelType === 'real') {
    // Special handling for JSON format model flattening animation
    if (modelPaths[currentModelType].type === 'json') {
      let modelName = '';
      if (currentModelType === 'cococola') {
        modelName = 'Fanta';
      } else if (currentModelType === 'fanda') {
        modelName = 'Sprite';
      } else if (currentModelType === 'real') {
        modelName = 'Classic Cola';
      }
      
      console.log(`Flattening JSON format ${modelName} model`);
      
      // Get current scale values
      const currentScale = currentModel.scale.clone();
      
      // Flatten model - reduce y value, slightly expand horizontal direction
      gsap.to(currentModel.scale, {
        y: currentScale.y * 0.2, // Flatten in vertical direction to 1/5 of original
        x: currentScale.x * 1.2, // Slightly expand in horizontal direction
        z: currentScale.z * 1.2, // Slightly expand in horizontal direction
        duration: 0.5,
        ease: "bounce.out"
      });
    } else {
      // Original GLTF model handling logic
      console.log(`Flattening ${currentModelType} GLTF model`);
      
      // Get current scale values
      const currentScale = currentModel.scale.clone();
      
      gsap.to(currentModel.scale, {
        y: currentScale.y * 0.2, // Flatten in vertical direction to 1/5 of original
        x: currentScale.x * 1.1, // Slightly expand in horizontal direction
        z: currentScale.z * 1.1, // Slightly expand in horizontal direction
        duration: 0.5,
        ease: "bounce.out"
      });
    }
  } else {
    // Original generic handling logic
    // Find main body part
    let bodyFound = false;
    currentModel.traverse((child) => {
      if (child.isMesh && (child.name.includes("body") || child.name.includes("bottle") || child.name.includes("can"))) {
        bodyFound = true;
        // Get current scale values
        const currentScale = child.scale.clone();
        
        // Animate flattening of bottle/can
        gsap.to(child.scale, {
          y: currentScale.y * 0.2, // Flatten in vertical direction
          x: currentScale.x * 1.2, // Slightly expand in horizontal direction
          z: currentScale.z * 1.2, // Slightly expand in horizontal direction
          duration: 0.5,
          ease: "bounce.out"
        });
      }
    });
    
    // If specific part cannot be found, try flattening the entire model
    if (!bodyFound) {
      // Get current scale values
      const currentScale = currentModel.scale.clone();
      
      gsap.to(currentModel.scale, {
        y: currentScale.y * 0.2, // Flatten in vertical direction
        x: currentScale.x * 1.2, // Slightly expand in horizontal direction
        z: currentScale.z * 1.2, // Slightly expand in horizontal direction
        duration: 0.5,
        ease: "bounce.out"
      });
    }
  }
}

// Reset model function
function resetModel() {
  if (!currentModel) return;
  
  // Reload current model
  loadModel(currentModelType);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Ensure controls update (if enabled)
  if (controls.enabled) {
    controls.update();
  }
  
  // Render using post-processing effects
  if (bloomPass.enabled || outlinePass.enabled || toonPass.enabled || xrayPass.enabled) {
    composer.render();
  } else {
  renderer.render(scene, camera);
  }
}

// Add toggle auto-rotate function
function toggleAutoRotate() {
  if (controls.enabled) {
    controls.autoRotate = !controls.autoRotate;
    
    // Get current active model page's button
    let autoRotateBtn;
    if (currentModelType === 'real') {
      autoRotateBtn = document.getElementById("auto-rotate-real");
    } else if (currentModelType === 'fanda') {
      autoRotateBtn = document.getElementById("auto-rotate-fanda");
    } else if (currentModelType === 'cococola') {
      autoRotateBtn = document.getElementById("auto-rotate-cococola");
    }
    
    if (autoRotateBtn) {
      if (controls.autoRotate) {
        autoRotateBtn.classList.add("bg-red-500");
        autoRotateBtn.classList.remove("bg-white");
        autoRotateBtn.classList.add("text-white");
      } else {
        autoRotateBtn.classList.remove("bg-red-500");
        autoRotateBtn.classList.add("bg-white");
        autoRotateBtn.classList.remove("text-white");
      }
    }
    
    controls.update();
  }
}

// Start animation loop
animate();

// Ensure all DOM operations execute after DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded, initializing navigation events');
  
  // Get page references
  homePage = document.getElementById("home-page");
  productsPage = document.getElementById("products-page");
  modelPage = document.getElementById("model-page");
  realModelPage = document.getElementById("real-model-page");
  fandaModelPage = document.getElementById("fanda-model-page");
  cococolaModelPage = document.getElementById("cococola-model-page");
  aboutPage = document.getElementById("about-page");
  contactPage = document.getElementById("contact-page");
  
  // Get navigation elements and add event listeners
  const homeLink = document.getElementById("home-link");
  const productsLink = document.getElementById("products-link");
  const aboutLink = document.getElementById("about-link");
  const contactLink = document.getElementById("contact-link");
  const exploreProductsBtn = document.getElementById("explore-products");
  
  // Clear all possibly existing old event listeners (prevent duplicate registration)
  if (homeLink) {
    // Clone node and replace, removing all event listeners
    const newHomeLink = homeLink.cloneNode(true);
    homeLink.parentNode.replaceChild(newHomeLink, homeLink);
    
    // Add event listener to new node using capture mode
    console.log("Found home link, adding event listener");
    newHomeLink.addEventListener('click', function(e) {
      console.log("Home link clicked");
      e.preventDefault();
      e.stopPropagation();
      showHomePage();
    }, true);
  } else {
    console.error("Home link not found");
  }
  
  if (productsLink) {
    console.log("Found products link, adding event listener");
    productsLink.addEventListener('click', function(e) {
      console.log("Products link clicked");
      e.preventDefault();
      showProductsPage();
    });
  } else {
    console.error("Products link not found");
  }
  
  if (aboutLink) {
    console.log("Found about link, adding event listener");
    aboutLink.addEventListener('click', function(e) {
      console.log("About link clicked");
      e.preventDefault();
      showAboutPage();
    });
  } else {
    console.error("About link not found");
  }
  
  if (contactLink) {
    console.log("Found contact us link, adding event listener");
    contactLink.addEventListener('click', function(e) {
      console.log("Contact us link clicked");
      e.preventDefault();
      showContactPage();
    });
  } else {
    console.error("Contact us link not found");
  }
  
  // Explore products button
  if (exploreProductsBtn) {
    exploreProductsBtn.addEventListener('click', function(e) {
      console.log("Explore products button clicked");
      e.preventDefault();
      showProductsPage();
    });
  }
  
  // Back button event listeners
  if (backToProductsFromRealBtn) {
    backToProductsFromRealBtn.addEventListener("click", function() {
      console.log("Back to products page button clicked (real)");
      showProductsPage();
    });
  }
  
  if (backToProductsFromFandaBtn) {
    backToProductsFromFandaBtn.addEventListener("click", function() {
      console.log("Back to products page button clicked (fanda)");
      showProductsPage();
    });
  }
  
  if (backToProductsFromCococolaBtn) {
    backToProductsFromCococolaBtn.addEventListener("click", function() {
      console.log("Back to products page button clicked (cococola)");
      showProductsPage();
    });
  }
  
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", function() {
      showHomePage();
    });
  }
  
  if (backToHomeFromContactBtn) {
    backToHomeFromContactBtn.addEventListener("click", function() {
      showHomePage();
    });
  }
  
  // Product explore button event handling
  const productExploreButtons = document.querySelectorAll(".product-explore-btn");
  productExploreButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modelType = btn.getAttribute("data-product");
      console.log(`Product explore button clicked: ${modelType}`);
      e.preventDefault();
      if (modelType) {
        loadAndShowModel(modelType);
      }
    });
  });
  
  // Product card event handling
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach(card => {
    card.addEventListener("click", (e) => {
      const modelType = card.getAttribute("data-model");
      console.log(`Product card clicked: ${modelType}`);
      e.preventDefault();
      if (modelType) {
        loadAndShowModel(modelType);
      }
    });
  });
  
  // Classic model interaction functions
  const openCapRealBtn = document.getElementById("open-cap-real");
  if (openCapRealBtn) {
    openCapRealBtn.addEventListener("click", openLid);
  }
  
  const flattenRealBtn = document.getElementById("flatten-real");
  if (flattenRealBtn) {
    flattenRealBtn.addEventListener("click", flattenBottle);
  }
  
  const resetModelRealBtn = document.getElementById("reset-model-real");
  if (resetModelRealBtn) {
    resetModelRealBtn.addEventListener("click", resetModel);
  }
  
  const autoRotateRealBtn = document.getElementById("auto-rotate-real");
  if (autoRotateRealBtn) {
    autoRotateRealBtn.addEventListener("click", toggleAutoRotate);
  }
  
  // New model interaction functions
  const openCapFandaBtn = document.getElementById("open-cap-fanda");
  if (openCapFandaBtn) {
    openCapFandaBtn.addEventListener("click", openLid);
  }
  
  const flattenFandaBtn = document.getElementById("flatten-fanda");
  if (flattenFandaBtn) {
    flattenFandaBtn.addEventListener("click", flattenBottle);
  }
  
  const resetModelFandaBtn = document.getElementById("reset-model-fanda");
  if (resetModelFandaBtn) {
    resetModelFandaBtn.addEventListener("click", resetModel);
  }
  
  const autoRotateFandaBtn = document.getElementById("auto-rotate-fanda");
  if (autoRotateFandaBtn) {
    autoRotateFandaBtn.addEventListener("click", toggleAutoRotate);
  }
  
  // Fanta model interaction functions
  const openCapCococolaBtn = document.getElementById("open-cap-cococola");
  if (openCapCococolaBtn) {
    openCapCococolaBtn.addEventListener("click", openLid);
  }
  
  const flattenCococolaBtn = document.getElementById("flatten-cococola");
  if (flattenCococolaBtn) {
    flattenCococolaBtn.addEventListener("click", flattenBottle);
  }
  
  const resetModelCococolaBtn = document.getElementById("reset-model-cococola");
  if (resetModelCococolaBtn) {
    resetModelCococolaBtn.addEventListener("click", resetModel);
  }
  
  const autoRotateCococolaBtn = document.getElementById("auto-rotate-cococola");
  if (autoRotateCococolaBtn) {
    autoRotateCococolaBtn.addEventListener("click", toggleAutoRotate);
  }
  
  // Material control and effect control button event listeners
  // This part of code remains unchanged, no need to modify...
  
  // Add lighting control event listeners
  const ambientLightRealSlider = document.getElementById("ambient-light-real");
  if (ambientLightRealSlider) {
    ambientLightRealSlider.addEventListener("input", () => {
      ambientLight.intensity = parseFloat(ambientLightRealSlider.value);
    });
  }
  
  const mainLightRealSlider = document.getElementById("main-light-real");
  if (mainLightRealSlider) {
    mainLightRealSlider.addEventListener("input", () => {
      mainLight.intensity = parseFloat(mainLightRealSlider.value);
    });
  }
  
  const lightColorRealPicker = document.getElementById("light-color-real");
  if (lightColorRealPicker) {
    lightColorRealPicker.addEventListener("input", () => {
      const color = new THREE.Color(lightColorRealPicker.value);
      mainLight.color.set(color);
      spotLight.color.set(color);
    });
  }
  
  const toggleSpotlightReal = document.getElementById("toggle-spotlight-real");
  if (toggleSpotlightReal) {
    toggleSpotlightReal.addEventListener("change", () => {
      spotLight.visible = toggleSpotlightReal.checked;
    });
  }
  
  // Add camera control events
  const viewFrontRealBtn = document.getElementById("view-front-real");
  if (viewFrontRealBtn) {
    viewFrontRealBtn.addEventListener("click", () => setCameraView("front"));
  }
  
  const viewBackRealBtn = document.getElementById("view-back-real");
  if (viewBackRealBtn) {
    viewBackRealBtn.addEventListener("click", () => setCameraView("back"));
  }
  
  const viewTopRealBtn = document.getElementById("view-top-real");
  if (viewTopRealBtn) {
    viewTopRealBtn.addEventListener("click", () => setCameraView("top"));
  }
  
  const viewBottomRealBtn = document.getElementById("view-bottom-real");
  if (viewBottomRealBtn) {
    viewBottomRealBtn.addEventListener("click", () => setCameraView("bottom"));
  }
  
  // Add material control events
  const materialDefaultRealBtn = document.getElementById("material-default-real");
  if (materialDefaultRealBtn) {
    materialDefaultRealBtn.addEventListener("click", () => setMaterial("default"));
  }
  
  const materialWireframeRealBtn = document.getElementById("material-wireframe-real");
  if (materialWireframeRealBtn) {
    materialWireframeRealBtn.addEventListener("click", () => setMaterial("wireframe"));
  }
  
  const materialShinyRealBtn = document.getElementById("material-shiny-real");
  if (materialShinyRealBtn) {
    materialShinyRealBtn.addEventListener("click", () => setMaterial("shiny"));
  }
  
  const materialMatteRealBtn = document.getElementById("material-matte-real");
  if (materialMatteRealBtn) {
    materialMatteRealBtn.addEventListener("click", () => setMaterial("matte"));
  }
  
  // Add effect control events
  const effectNoneRealBtn = document.getElementById("effect-none-real");
  if (effectNoneRealBtn) {
    effectNoneRealBtn.addEventListener("click", () => setEffect("none"));
  }
  
  const effectGlowRealBtn = document.getElementById("effect-glow-real");
  if (effectGlowRealBtn) {
    effectGlowRealBtn.addEventListener("click", () => setEffect("glow"));
  }
  
  const effectToonRealBtn = document.getElementById("effect-toon-real");
  if (effectToonRealBtn) {
    effectToonRealBtn.addEventListener("click", () => setEffect("toon"));
  }
  
  const effectXrayRealBtn = document.getElementById("effect-xray-real");
  if (effectXrayRealBtn) {
    effectXrayRealBtn.addEventListener("click", () => setEffect("xray"));
  }
  
  // Initialize form handling
  initContactForm();
  
  // Show home page after page load
  showHomePage();
  
  // Add click event handling for "Contact Us" button in about page
  const contactUsBtn = document.getElementById("contact-us-btn");
  if (contactUsBtn) {
    contactUsBtn.addEventListener("click", function(e) {
      console.log("Contact Us button in about page clicked");
      e.preventDefault();
      e.stopPropagation();
      showContactPage();
    });
  }
});

// Handle contact form submission
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');
  const formError = document.getElementById('form-error');

  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const formDataObj = {};
      
      formData.forEach((value, key) => {
        formDataObj[key] = value;
      });
      
      try {
        // Send data to backend
        const response = await fetch('http://localhost:8000/api/contacts/submit/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formDataObj)
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
          // Show success message
          formSuccess.classList.remove('hidden');
          formError.classList.add('hidden');
          contactForm.reset();
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            formSuccess.classList.add('hidden');
          }, 5000);
        } else {
          // Show error message
          formError.textContent = responseData.errors ? 'Form has errors, please check and resubmit.' : responseData.message;
          formError.classList.remove('hidden');
          formSuccess.classList.add('hidden');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        formError.textContent = 'Submission failed. Please try again later or contact us directly.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
      }
    });
  }
}

// Ensure model has correct normals and UV coordinates
function ensureNormalsAndUVs(mesh) {
  // Check if geometry exists
  if (!mesh.geometry) {
    console.log('Mesh has no geometry data');
    return;
  }
  
  // Check and fix normals
  if (!mesh.geometry.attributes.normal) {
    console.log('Computing normals');
    mesh.geometry.computeVertexNormals();
  }
  
  // Check and fix UV coordinates
  if (!mesh.geometry.attributes.uv) {
    console.log('Generating simple UV coordinates');
    // Create a simple UV mapping
    const position = mesh.geometry.attributes.position;
    const count = position.count;
    const uvs = new Float32Array(count * 2);
    
    for (let i = 0; i < count; i++) {
      // Generate simple UV coordinates based on position
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      // Use position coordinate projection as UV
      uvs[i * 2] = (x + 1) / 2;  // U: map to 0-1 range
      uvs[i * 2 + 1] = (y + 1) / 2;  // V: map to 0-1 range
    }
    
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    mesh.geometry.attributes.uv.needsUpdate = true;
  }
  
  // Mark geometry for update
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
  mesh.geometry.computeBoundingBox();
}