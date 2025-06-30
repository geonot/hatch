/**
 * @file UIExampleScene.js
 * @description Example scene demonstrating the enhanced UI system capabilities
 */

import Scene from '../scenes/Scene.js';
import { FormValidator } from '../ui/FormValidator.js';

/**
 * @class UIExampleScene
 * @classdesc Example scene showcasing various UI components and features
 */
export class UIExampleScene extends Scene {
    constructor(engine) {
        super(engine, {
            enableUI: true,
            uiTheme: 'default',
            uiConfig: {
                responsive: true,
                animations: true
            }
        });
        
        this.currentTab = 'components';
        this.formData = {};
    }

    async load() {
        // Load any UI-specific assets
        await super.load();
        
        // Example: Load custom fonts or UI textures
        // await this.assetManager.loadAsset({
        //     name: 'customFont',
        //     path: 'assets/fonts/custom.woff2',
        //     type: 'font'
        // });
    }

    init() {
        super.init();
        
        // Set up the main UI layout
        this.setupMainLayout();
        
        // Create different UI sections
        this.setupHeader();
        this.setupTabNavigation();
        this.setupComponentsTab();
        this.setupFormsTab();
        this.setupLayoutsTab();
        this.setupAnimationsTab();
        
        // Show initial tab
        this.showTab(this.currentTab);
    }

    setupMainLayout() {
        // Create main container with flex layout
        this.mainLayout = this.createUILayout('main', 'flex', {
            direction: 'column',
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            gap: 20
        });
        
        // Update layout bounds to match canvas
        const canvas = this.renderingEngine.canvas;
        this.mainLayout.updateContainer({
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height
        });
    }

    setupHeader() {
        // Create header container
        const headerContainer = this.createUIComponent('header', 'container', {
            width: '100%',
            height: 80,
            backgroundColor: this.uiManager.getCurrentTheme().colors.primary,
            borderRadius: 8,
            padding: { top: 20, right: 20, bottom: 20, left: 20 }
        });
        
        // Title label
        const titleLabel = this.createUIComponent('title', 'label', {
            text: 'Hatch Engine UI System Demo',
            textType: 'heading1',
            textColor: '#ffffff',
            textAlign: 'center'
        });
        
        // Add to layout
        this.mainLayout.addChild(headerContainer);
        
        // Create flex layout for header content
        const headerLayout = this.createUILayout('headerLayout', 'flex', {
            direction: 'row',
            justifyContent: 'center',
            alignItems: 'center'
        });
        
        headerLayout.addChild(titleLabel);
        headerLayout.updateContainer(headerContainer.getBounds());
    }

    setupTabNavigation() {
        // Create tab navigation container
        const tabContainer = this.createUIComponent('tabContainer', 'container', {
            width: '100%',
            height: 50
        });
        
        // Create tab buttons
        const tabs = [
            { id: 'components', label: 'Components' },
            { id: 'forms', label: 'Forms' },
            { id: 'layouts', label: 'Layouts' },
            { id: 'animations', label: 'Animations' }
        ];
        
        const tabLayout = this.createUILayout('tabLayout', 'flex', {
            direction: 'row',
            gap: 10
        });
        
        tabs.forEach(tab => {
            const button = this.createUIComponent(`tab_${tab.id}`, 'button', {
                text: tab.label,
                variant: tab.id === this.currentTab ? 'primary' : 'secondary',
                width: 120,
                height: 40
            });
            
            button.on('click', () => this.showTab(tab.id));
            tabLayout.addChild(button);
        });
        
        this.mainLayout.addChild(tabContainer);
        tabLayout.updateContainer(tabContainer.getBounds());
    }

    setupComponentsTab() {
        const container = this.createUIComponent('componentsTab', 'container', {
            width: '100%',
            height: 400,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            visible: true
        });
        
        const layout = this.createUILayout('componentsLayout', 'grid', {
            templateColumns: 'repeat(3, 1fr)',
            gap: 20
        });
        
        // Button examples
        const primaryButton = this.createUIComponent('primaryBtn', 'button', {
            text: 'Primary Button',
            variant: 'primary',
            width: 150,
            height: 40
        });
        primaryButton.on('click', () => this.showNotification('Primary button clicked!'));
        
        const secondaryButton = this.createUIComponent('secondaryBtn', 'button', {
            text: 'Secondary',
            variant: 'secondary',
            width: 150,
            height: 40
        });
        
        const dangerButton = this.createUIComponent('dangerBtn', 'button', {
            text: 'Danger',
            variant: 'danger',
            width: 150,
            height: 40
        });
        dangerButton.on('click', () => {
            this.showModal({
                title: 'Confirm Action',
                message: 'Are you sure you want to perform this dangerous action?',
                buttons: ['Cancel', 'Confirm'],
                onClose: (result) => {
                    if (result === 'Confirm') {
                        this.showNotification('Action confirmed!', { type: 'warning' });
                    }
                }
            });
        });
        
        // Label examples
        const headingLabel = this.createUIComponent('heading', 'label', {
            text: 'This is a heading',
            textType: 'heading2'
        });
        
        const bodyLabel = this.createUIComponent('bodyText', 'label', {
            text: 'This is body text with word wrapping enabled.',
            textType: 'body',
            wordWrap: true,
            width: 200
        });
        
        const richTextLabel = this.createUIComponent('richText', 'label', {
            richText: true,
            markup: '<b>Bold text</b> and <i>italic text</i> with <color=#ff0000>colored text</color>',
            width: 200
        });
        
        // Progress bar
        const progressBar = this.createUIComponent('progress', 'progressbar', {
            value: 65,
            max: 100,
            width: 200,
            height: 20,
            showLabel: true
        });
        
        // Animated progress
        this.setInterval(() => {
            const currentValue = progressBar.getValue();
            const newValue = (currentValue + 5) % 105;
            progressBar.setValue(newValue);
        }, 100);
        
        // Add all components to layout
        [primaryButton, secondaryButton, dangerButton, 
         headingLabel, bodyLabel, richTextLabel, 
         container, progressBar].forEach(component => {
            layout.addChild(component);
        });
        
        this.mainLayout.addChild(container);
        layout.updateContainer(container.getBounds());
    }

    setupFormsTab() {
        const container = this.createUIComponent('formsTab', 'container', {
            width: '100%',
            height: 400,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            visible: false
        });
        
        // Create form using fluent API
        const form = this.ui
            .container()
            .size(400, 350)
            .padding(20)
            .backgroundColor('#ffffff')
            .rounded(8)
            .build();
        
        // Form title
        const formTitle = this.ui
            .label('User Registration')
            .textType('heading3')
            .marginBottom(20)
            .build();
        
        // Email input
        const emailInput = this.createUIComponent('emailInput', 'input', {
            type: 'email',
            placeholder: 'Enter your email',
            width: 300,
            height: 40,
            required: true
        });
        
        // Password input
        const passwordInput = this.createUIComponent('passwordInput', 'input', {
            type: 'password',
            placeholder: 'Enter your password',
            width: 300,
            height: 40,
            required: true
        });
        
        // Confirm password input
        const confirmPasswordInput = this.createUIComponent('confirmPasswordInput', 'input', {
            type: 'password',
            placeholder: 'Confirm your password',
            width: 300,
            height: 40,
            required: true
        });
        
        // Submit button
        const submitButton = this.ui
            .button('Register')
            .variant('primary')
            .size(120, 40)
            .onClick(() => this.handleFormSubmit())
            .build();
        
        // Create form validator
        this.userForm = this.createForm('userRegistration', {
            email: {
                component: emailInput,
                validators: FormValidator.rules.email(),
                required: true
            },
            password: {
                component: passwordInput,
                validators: FormValidator.rules.password(8),
                required: true
            },
            confirmPassword: {
                component: confirmPasswordInput,
                validators: FormValidator.rules.passwordConfirm('password'),
                required: true
            }
        });
        
        // Create vertical layout for form
        const formLayout = this.createUILayout('formLayout', 'flex', {
            direction: 'column',
            gap: 15,
            alignItems: 'flex-start'
        });
        
        formLayout.addChild(formTitle);
        formLayout.addChild(emailInput);
        formLayout.addChild(passwordInput);
        formLayout.addChild(confirmPasswordInput);
        formLayout.addChild(submitButton);
        
        container.addChild(form);
        this.mainLayout.addChild(container);
        formLayout.updateContainer(form.getBounds());
    }

    setupLayoutsTab() {
        const container = this.createUIComponent('layoutsTab', 'container', {
            width: '100%',
            height: 400,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            visible: false
        });
        
        // Demonstrate different layout types
        const layoutExamples = this.createUILayout('layoutExamples', 'grid', {
            templateColumns: '1fr 1fr',
            gap: 20
        });
        
        // Flex layout example
        const flexContainer = this.createUIComponent('flexExample', 'container', {
            width: 250,
            height: 150,
            backgroundColor: '#ffffff',
            borderRadius: 4,
            padding: { top: 10, right: 10, bottom: 10, left: 10 }
        });
        
        const flexLayout = this.createUILayout('flexLayoutExample', 'flex', {
            direction: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: 10
        });
        
        // Add some items to flex layout
        for (let i = 1; i <= 3; i++) {
            const item = this.createUIComponent(`flexItem${i}`, 'button', {
                text: `Item ${i}`,
                width: 60,
                height: 30,
                variant: 'outline'
            });
            flexLayout.addChild(item);
        }
        
        // Grid layout example
        const gridContainer = this.createUIComponent('gridExample', 'container', {
            width: 250,
            height: 150,
            backgroundColor: '#ffffff',
            borderRadius: 4,
            padding: { top: 10, right: 10, bottom: 10, left: 10 }
        });
        
        const gridLayout = this.createUILayout('gridLayoutExample', 'grid', {
            templateRows: 'repeat(2, 1fr)',
            templateColumns: 'repeat(2, 1fr)',
            gap: 5
        });
        
        // Add items to grid layout
        for (let i = 1; i <= 4; i++) {
            const item = this.createUIComponent(`gridItem${i}`, 'container', {
                backgroundColor: `hsl(${i * 60}, 70%, 85%)`,
                borderRadius: 4
            });
            gridLayout.addChild(item);
        }
        
        layoutExamples.addChild(flexContainer);
        layoutExamples.addChild(gridContainer);
        
        flexLayout.updateContainer(flexContainer.getBounds());
        gridLayout.updateContainer(gridContainer.getBounds());
        
        this.mainLayout.addChild(container);
        layoutExamples.updateContainer(container.getBounds());
    }

    setupAnimationsTab() {
        const container = this.createUIComponent('animationsTab', 'container', {
            width: '100%',
            height: 400,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            visible: false
        });
        
        // Animation demo buttons
        const animationLayout = this.createUILayout('animationLayout', 'flex', {
            direction: 'row',
            gap: 20,
            justifyContent: 'center',
            alignItems: 'center'
        });
        
        // Target element to animate
        const animationTarget = this.createUIComponent('animationTarget', 'container', {
            width: 100,
            height: 100,
            backgroundColor: '#007bff',
            borderRadius: 8
        });
        
        // Animation control buttons
        const fadeButton = this.ui
            .button('Fade In/Out')
            .onClick(() => this.animateFade(animationTarget))
            .build();
        
        const slideButton = this.ui
            .button('Slide')
            .onClick(() => this.animateSlide(animationTarget))
            .build();
        
        const scaleButton = this.ui
            .button('Scale')
            .onClick(() => this.animateScale(animationTarget))
            .build();
        
        const rotateButton = this.ui
            .button('Rotate')
            .onClick(() => this.animateRotate(animationTarget))
            .build();
        
        animationLayout.addChild(fadeButton);
        animationLayout.addChild(slideButton);
        animationLayout.addChild(scaleButton);
        animationLayout.addChild(rotateButton);
        animationLayout.addChild(animationTarget);
        
        this.mainLayout.addChild(container);
        animationLayout.updateContainer(container.getBounds());
    }

    showTab(tabId) {
        // Hide all tabs
        ['components', 'forms', 'layouts', 'animations'].forEach(id => {
            const tab = this.getUIComponent(`${id}Tab`);
            if (tab) tab.setVisible(false);
            
            const button = this.getUIComponent(`tab_${id}`);
            if (button) button.setVariant(id === tabId ? 'primary' : 'secondary');
        });
        
        // Show selected tab
        const selectedTab = this.getUIComponent(`${tabId}Tab`);
        if (selectedTab) selectedTab.setVisible(true);
        
        this.currentTab = tabId;
    }

    handleFormSubmit() {
        if (this.userForm.validate()) {
            const values = this.userForm.getValues();
            this.showNotification('Registration successful!', { type: 'success' });
            console.log('Form submitted:', values);
        } else {
            this.showNotification('Please fix the form errors', { type: 'error' });
        }
    }

    // Animation examples
    async animateFade(target) {
        await this.animateUI(target, {
            from: { opacity: target.opacity },
            to: { opacity: target.opacity > 0.5 ? 0.2 : 1 },
            duration: 500,
            easing: 'easeInOutQuad'
        });
    }

    async animateSlide(target) {
        const originalX = target.x;
        await this.animateUI(target, {
            from: { x: originalX },
            to: { x: originalX + 50 },
            duration: 300,
            easing: 'easeOutBounce'
        });
        
        // Slide back
        await this.animateUI(target, {
            from: { x: originalX + 50 },
            to: { x: originalX },
            duration: 300,
            easing: 'easeOutBounce'
        });
    }

    async animateScale(target) {
        const originalWidth = target.width;
        const originalHeight = target.height;
        
        await this.animateUI(target, {
            from: { width: originalWidth, height: originalHeight },
            to: { width: originalWidth * 1.5, height: originalHeight * 1.5 },
            duration: 300,
            easing: 'easeOutElastic'
        });
        
        // Scale back
        await this.animateUI(target, {
            from: { width: originalWidth * 1.5, height: originalHeight * 1.5 },
            to: { width: originalWidth, height: originalHeight },
            duration: 300,
            easing: 'easeOutElastic'
        });
    }

    async animateRotate(target) {
        // Note: This would require rotation support in the UI system
        // For now, we'll animate background color change as a substitute
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#007bff'];
        
        for (let i = 0; i < colors.length - 1; i++) {
            await this.animateUI(target, {
                from: { backgroundColor: colors[i] },
                to: { backgroundColor: colors[i + 1] },
                duration: 200,
                easing: 'linear'
            });
        }
    }

    onFormValidation(formName, result) {
        console.log(`Form ${formName} validation:`, result);
    }

    onFormSubmit(formName, values, validator) {
        console.log(`Form ${formName} submitted:`, values);
        return true;
    }

    async enter() {
        await super.enter();
        
        // Animate entrance
        const header = this.getUIComponent('header');
        if (header) {
            await this.animateUI(header, {
                from: { opacity: 0, y: -50 },
                to: { opacity: 1, y: header.y },
                duration: 500,
                easing: 'easeOutBack'
            });
        }
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update layouts
        for (const layout of this.uiLayouts.values()) {
            if (layout.layout) {
                layout.layout();
            }
        }
    }
}
