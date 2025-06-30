# Hatch Engine UI System

The Hatch Engine includes a comprehensive UI system that provides modern, theme-based user interface components with minimal boilerplate code. The system is designed to be powerful yet easy to use, with support for responsive layouts, animations, form validation, and more.

## Features

### 🎨 **Theme System**
- Light and dark themes out of the box
- Extensible theming with custom color palettes, fonts, and spacing
- Component-specific theme customization
- Runtime theme switching

### 🧩 **Component Library**
- **UIButton**: Interactive buttons with multiple variants (primary, secondary, outline, ghost, danger)
- **UILabel**: Text display with rich text support, animations, and typography options
- **UIInput**: Text input with validation, formatting, and auto-complete
- **UIContainer**: Layout containers with styling options
- **UIModal**: Modal dialogs with focus management
- **UIProgressBar**: Progress indicators with customizable styling
- And more...

### 📐 **Layout System**
- **FlexLayout**: CSS Flexbox-style layout with direction, alignment, and distribution
- **GridLayout**: CSS Grid-style layout with template areas and responsive capabilities
- **AbsoluteLayout**: Precise positioning with anchoring and constraints
- **StackLayout**: Layered components with z-index management

### 🚀 **Fluent API (UIBuilder)**
- Method chaining for reduced boilerplate
- Intuitive component creation and styling
- Event handling with lambda support
- Preset component patterns

### ✅ **Form Validation**
- Built-in validators (required, email, password, number, etc.)
- Custom validator support
- Real-time validation feedback
- Form submission handling

### 🎬 **Animation System**
- Property-based animations with easing functions
- Component-specific animations (fade, slide, scale)
- Timeline-based animation sequences
- Smooth transitions between states

## Quick Start

### Basic Scene with UI

```javascript
import Scene from '../engine/scenes/Scene.js';

class MyScene extends Scene {
    constructor(engine) {
        super(engine, {
            enableUI: true,
            uiTheme: 'default'
        });
    }

    init() {
        super.init();
        this.setupUI();
    }

    setupUI() {
        // Create a button using fluent API
        const button = this.ui
            .button('Click Me!')
            .variant('primary')
            .at(100, 100)
            .size(120, 40)
            .onClick(() => this.showNotification('Button clicked!'))
            .build();

        // Create a label
        const label = this.ui
            .label('Welcome to Hatch Engine')
            .textType('heading1')
            .at(100, 50)
            .color('#333333')
            .build();
    }
}
```

### Using Layouts

```javascript
// Create a flex layout
const layout = this.createUILayout('main', 'flex', {
    direction: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20
});

// Add components to layout
layout.addChild(titleLabel);
layout.addChild(buttonContainer);
layout.addChild(footer);

// Update layout bounds
layout.updateContainer({
    x: 0, y: 0,
    width: canvas.width,
    height: canvas.height
});
```

### Form Validation

```javascript
// Create form inputs
const emailInput = this.createUIComponent('email', 'input', {
    type: 'email',
    placeholder: 'Enter your email',
    required: true
});

const passwordInput = this.createUIComponent('password', 'input', {
    type: 'password',
    placeholder: 'Enter your password',
    required: true
});

// Create form validator
const form = this.createForm('login', {
    email: {
        component: emailInput,
        validators: FormValidator.rules.email(),
        required: true
    },
    password: {
        component: passwordInput,
        validators: FormValidator.rules.password(8),
        required: true
    }
});

// Handle form submission
form.onSubmit = (values) => {
    console.log('Login:', values);
    this.handleLogin(values);
};
```

### Animations

```javascript
// Animate component properties
await this.animateUI(button, {
    from: { opacity: 0, y: -50 },
    to: { opacity: 1, y: 100 },
    duration: 500,
    easing: 'easeOutBack'
});

// Chain animations
await this.animateUI(panel, {
    from: { width: 0 },
    to: { width: 300 },
    duration: 300
});

await this.animateUI(panel, {
    from: { height: 0 },
    to: { height: 200 },
    duration: 300
});
```

## Component Reference

### UIButton

```javascript
const button = this.createUIComponent('myButton', 'button', {
    text: 'Click me',
    variant: 'primary',        // 'primary', 'secondary', 'outline', 'ghost', 'danger'
    size: 'medium',           // 'small', 'medium', 'large'
    width: 120,
    height: 40,
    icon: '👍',               // Optional icon
    iconPosition: 'left',     // 'left', 'right', 'top', 'bottom'
    loading: false,           // Show loading state
    disabled: false
});

button.on('click', () => console.log('Clicked!'));
```

### UILabel

```javascript
const label = this.createUIComponent('myLabel', 'label', {
    text: 'Hello World',
    textType: 'heading1',     // 'heading1', 'heading2', 'heading3', 'body', 'caption'
    textColor: '#333333',
    textAlign: 'center',      // 'left', 'center', 'right'
    wordWrap: true,
    maxLines: 3,
    richText: true,           // Enable markup support
    markup: '<b>Bold</b> and <i>italic</i> text'
});

// Text animations
label.startAnimation('typewriter', 50);
```

### UIInput

```javascript
const input = this.createUIComponent('myInput', 'input', {
    type: 'email',            // 'text', 'password', 'email', 'number', 'tel', 'url'
    placeholder: 'Enter email',
    value: '',
    maxLength: 100,
    required: true,
    readonly: false,
    multiline: false,
    
    // Validation
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validators: [
        (value) => value.includes('@') || 'Must contain @'
    ]
});

input.on('change', (e) => console.log('Value:', e.value));
input.on('validation', (e) => console.log('Valid:', e.valid));
```

## Layout System

### FlexLayout

```javascript
const flexLayout = this.createUILayout('flex', 'flex', {
    direction: 'row',         // 'row', 'column', 'row-reverse', 'column-reverse'
    justifyContent: 'center', // 'flex-start', 'center', 'flex-end', 'space-between', 'space-around'
    alignItems: 'center',     // 'flex-start', 'center', 'flex-end', 'stretch'
    gap: 10,
    wrap: false
});
```

### GridLayout

```javascript
const gridLayout = this.createUILayout('grid', 'grid', {
    templateRows: 'repeat(3, 1fr)',
    templateColumns: 'repeat(3, 1fr)',
    gap: 10,
    templateAreas: [
        'header header header',
        'sidebar main main',
        'footer footer footer'
    ]
});
```

### AbsoluteLayout

```javascript
const absoluteLayout = this.createUILayout('absolute', 'absolute');

absoluteLayout.addChild(component, {
    x: 100,
    y: 100,
    anchor: {
        horizontal: 'center',
        vertical: 'middle'
    },
    constraints: {
        minX: 0,
        maxX: 800,
        keepInBounds: true
    },
    responsive: {
        breakpoints: {
            '768': { x: 50, y: 50 }
        }
    }
});
```

## Theming System

### Custom Theme

```javascript
const customTheme = {
    name: 'custom',
    colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        light: '#f8f9fa',
        dark: '#343a40',
        
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textSecondary: '#6c757d'
    },
    
    fonts: {
        primary: 'system-ui, -apple-system, sans-serif',
        secondary: 'Georgia, serif',
        mono: 'Monaco, Consolas, monospace'
    },
    
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
    },
    
    components: {
        button: {
            borderRadius: 6,
            padding: { top: 8, right: 16, bottom: 8, left: 16 },
            variants: {
                primary: {
                    backgroundColor: '#007bff',
                    textColor: '#ffffff',
                    borderColor: '#007bff'
                }
            }
        }
    }
};

// Apply theme
this.uiManager.addTheme(customTheme);
this.setUITheme('custom');
```

## Form Validation

### Built-in Validators

```javascript
const validators = {
    required: { name: 'required' },
    email: { name: 'email' },
    minLength: { name: 'minLength', params: 6 },
    maxLength: { name: 'maxLength', params: 50 },
    pattern: { name: 'pattern', params: /^[a-zA-Z0-9]+$/ },
    number: { name: 'number' },
    min: { name: 'min', params: 0 },
    max: { name: 'max', params: 100 },
    password: { name: 'password', params: { minLength: 8 } }
};
```

### Custom Validators

```javascript
// Add custom validator
FormValidator.prototype.addValidator('custom', (value, params) => {
    if (value === 'forbidden') {
        return 'This value is not allowed';
    }
    return true;
});

// Use in form
const form = this.createForm('myForm', {
    username: {
        component: usernameInput,
        validators: [
            { name: 'required' },
            { name: 'custom' }
        ]
    }
});
```

## Best Practices

### 1. Scene Organization

```javascript
class MyScene extends Scene {
    init() {
        super.init();
        this.setupLayout();
        this.setupComponents();
        this.setupEventHandlers();
    }
    
    setupLayout() {
        // Create main layout structure
    }
    
    setupComponents() {
        // Create UI components
    }
    
    setupEventHandlers() {
        // Set up event handling
    }
}
```

### 2. Component Management

```javascript
// Use meaningful component names
this.createUIComponent('loginButton', 'button', config);
this.createUIComponent('usernameInput', 'input', config);

// Group related components
this.loginComponents = new Map();
this.loginComponents.set('button', loginButton);
this.loginComponents.set('input', usernameInput);
```

### 3. Responsive Design

```javascript
// Use responsive layouts
const layout = this.createUILayout('main', 'flex', {
    direction: 'column',
    responsive: {
        breakpoints: {
            768: { direction: 'row' }
        }
    }
});

// Handle window resize
this.addEventListener(window, 'resize', () => {
    this.updateLayouts();
});
```

### 4. Animation Performance

```javascript
// Batch animations
const animations = [
    this.animateUI(button1, fadeIn),
    this.animateUI(button2, slideIn),
    this.animateUI(button3, scaleIn)
];

await Promise.all(animations);
```

### 5. Memory Management

The UI system automatically handles cleanup when scenes are destroyed, but you can help by:

```javascript
destroy() {
    // Clean up large data structures
    this.formData = null;
    this.cachedComponents.clear();
    
    super.destroy(); // Always call parent destroy
}
```

## Examples

See the `UIExampleScene.js` for a comprehensive demonstration of all UI system features, including:

- Component showcase
- Form validation examples
- Layout demonstrations
- Animation samples
- Theme switching
- Responsive design patterns

The UI system is designed to grow with your needs - start simple and add complexity as required!
