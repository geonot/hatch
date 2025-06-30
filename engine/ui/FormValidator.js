/**
 * @file FormValidator.js
 * @description Comprehensive form validation framework for the Hatch engine UI system
 */

/**
 * @class FormValidator
 * @classdesc Provides form validation with built-in and custom validators
 */
export class FormValidator {
    constructor(config = {}) {
        this.fields = new Map(); // fieldName -> field config
        this.errors = new Map(); // fieldName -> error message
        this.warnings = new Map(); // fieldName -> warning message
        this.validators = new Map(); // validator name -> validator function
        this.groups = new Map(); // group name -> field names
        
        this.validateOnChange = config.validateOnChange !== false;
        this.validateOnBlur = config.validateOnBlur !== false;
        this.validateOnSubmit = config.validateOnSubmit !== false;
        this.stopOnFirstError = config.stopOnFirstError || false;
        
        // Register built-in validators
        this._registerBuiltInValidators();
        
        // Event callbacks
        this.onValidation = config.onValidation || null;
        this.onFieldValidation = config.onFieldValidation || null;
        this.onSubmit = config.onSubmit || null;
    }

    /**
     * Register built-in validators
     */
    _registerBuiltInValidators() {
        // Required validator
        this.addValidator('required', (value, params = {}) => {
            const isEmpty = value === null || value === undefined || 
                           (typeof value === 'string' && value.trim() === '') ||
                           (Array.isArray(value) && value.length === 0);
            
            return isEmpty ? (params.message || 'This field is required') : true;
        });

        // Minimum length validator
        this.addValidator('minLength', (value, params) => {
            if (!value) return true; // Let required handle empty values
            const length = typeof value === 'string' ? value.length : String(value).length;
            const minLength = params.value || params;
            
            return length >= minLength ? 
                true : 
                (params.message || `Must be at least ${minLength} characters`);
        });

        // Maximum length validator
        this.addValidator('maxLength', (value, params) => {
            if (!value) return true;
            const length = typeof value === 'string' ? value.length : String(value).length;
            const maxLength = params.value || params;
            
            return length <= maxLength ? 
                true : 
                (params.message || `Must be no more than ${maxLength} characters`);
        });

        // Email validator
        this.addValidator('email', (value, params = {}) => {
            if (!value) return true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            return emailRegex.test(value) ? 
                true : 
                (params.message || 'Invalid email address');
        });

        // URL validator
        this.addValidator('url', (value, params = {}) => {
            if (!value) return true;
            try {
                new URL(value);
                return true;
            } catch {
                return params.message || 'Invalid URL';
            }
        });

        // Number validator
        this.addValidator('number', (value, params = {}) => {
            if (!value) return true;
            const num = Number(value);
            
            return !isNaN(num) ? 
                true : 
                (params.message || 'Must be a valid number');
        });

        // Integer validator
        this.addValidator('integer', (value, params = {}) => {
            if (!value) return true;
            const num = Number(value);
            
            return !isNaN(num) && Number.isInteger(num) ? 
                true : 
                (params.message || 'Must be a whole number');
        });

        // Minimum value validator
        this.addValidator('min', (value, params) => {
            if (!value) return true;
            const num = Number(value);
            const minValue = params.value || params;
            
            return !isNaN(num) && num >= minValue ? 
                true : 
                (params.message || `Must be at least ${minValue}`);
        });

        // Maximum value validator
        this.addValidator('max', (value, params) => {
            if (!value) return true;
            const num = Number(value);
            const maxValue = params.value || params;
            
            return !isNaN(num) && num <= maxValue ? 
                true : 
                (params.message || `Must be no more than ${maxValue}`);
        });

        // Pattern/regex validator
        this.addValidator('pattern', (value, params) => {
            if (!value) return true;
            const pattern = params.value || params.pattern || params;
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            
            return regex.test(value) ? 
                true : 
                (params.message || 'Invalid format');
        });

        // Phone number validator
        this.addValidator('phone', (value, params = {}) => {
            if (!value) return true;
            // Simple phone validation - can be customized
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            
            return phoneRegex.test(value.replace(/[\s\-\(\)]/g, '')) ? 
                true : 
                (params.message || 'Invalid phone number');
        });

        // Date validator
        this.addValidator('date', (value, params = {}) => {
            if (!value) return true;
            const date = new Date(value);
            
            return !isNaN(date.getTime()) ? 
                true : 
                (params.message || 'Invalid date');
        });

        // Custom regex patterns
        this.addValidator('alphanumeric', (value, params = {}) => {
            if (!value) return true;
            const regex = /^[a-zA-Z0-9]+$/;
            
            return regex.test(value) ? 
                true : 
                (params.message || 'Only letters and numbers allowed');
        });

        this.addValidator('alpha', (value, params = {}) => {
            if (!value) return true;
            const regex = /^[a-zA-Z]+$/;
            
            return regex.test(value) ? 
                true : 
                (params.message || 'Only letters allowed');
        });

        // Password strength validator
        this.addValidator('password', (value, params = {}) => {
            if (!value) return true;
            
            const minLength = params.minLength || 8;
            const requireUppercase = params.requireUppercase !== false;
            const requireLowercase = params.requireLowercase !== false;
            const requireNumbers = params.requireNumbers !== false;
            const requireSpecial = params.requireSpecial !== false;
            
            if (value.length < minLength) {
                return params.message || `Password must be at least ${minLength} characters`;
            }
            
            if (requireUppercase && !/[A-Z]/.test(value)) {
                return params.message || 'Password must contain uppercase letters';
            }
            
            if (requireLowercase && !/[a-z]/.test(value)) {
                return params.message || 'Password must contain lowercase letters';
            }
            
            if (requireNumbers && !/\d/.test(value)) {
                return params.message || 'Password must contain numbers';
            }
            
            if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                return params.message || 'Password must contain special characters';
            }
            
            return true;
        });

        // Confirmation validator (for password confirmation, etc.)
        this.addValidator('matches', (value, params) => {
            if (!value) return true;
            const matchField = params.field;
            const matchValue = this.getFieldValue(matchField);
            
            return value === matchValue ? 
                true : 
                (params.message || `Must match ${matchField}`);
        });
    }

    /**
     * Add a custom validator
     */
    addValidator(name, validatorFn) {
        this.validators.set(name, validatorFn);
        return this;
    }

    /**
     * Remove a validator
     */
    removeValidator(name) {
        this.validators.delete(name);
        return this;
    }

    /**
     * Add a field to validate
     */
    addField(name, config) {
        this.fields.set(name, {
            component: config.component || null,
            value: config.value,
            validators: config.validators || [],
            warnings: config.warnings || [],
            group: config.group || null,
            label: config.label || name,
            required: config.required || false,
            validateOnChange: config.validateOnChange !== undefined ? config.validateOnChange : this.validateOnChange,
            validateOnBlur: config.validateOnBlur !== undefined ? config.validateOnBlur : this.validateOnBlur
        });
        
        // Add to group if specified
        if (config.group) {
            if (!this.groups.has(config.group)) {
                this.groups.set(config.group, new Set());
            }
            this.groups.get(config.group).add(name);
        }
        
        // Set up component event listeners if component provided
        if (config.component) {
            this._setupComponentListeners(name, config.component);
        }
        
        return this;
    }

    /**
     * Remove a field
     */
    removeField(name) {
        const field = this.fields.get(name);
        if (field && field.group) {
            const group = this.groups.get(field.group);
            if (group) {
                group.delete(name);
                if (group.size === 0) {
                    this.groups.delete(field.group);
                }
            }
        }
        
        this.fields.delete(name);
        this.errors.delete(name);
        this.warnings.delete(name);
        return this;
    }

    /**
     * Set up component event listeners
     */
    _setupComponentListeners(fieldName, component) {
        if (component.on) {
            // Listen for value changes
            component.on('change', () => {
                const field = this.fields.get(fieldName);
                if (field && field.validateOnChange) {
                    this.validateField(fieldName);
                }
            });
            
            // Listen for blur events
            component.on('blur', () => {
                const field = this.fields.get(fieldName);
                if (field && field.validateOnBlur) {
                    this.validateField(fieldName);
                }
            });
        }
    }

    /**
     * Get field value
     */
    getFieldValue(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return undefined;
        
        if (field.component && typeof field.component.getValue === 'function') {
            return field.component.getValue();
        } else if (field.component && field.component.value !== undefined) {
            return field.component.value;
        } else {
            return field.value;
        }
    }

    /**
     * Set field value
     */
    setFieldValue(fieldName, value) {
        const field = this.fields.get(fieldName);
        if (!field) return this;
        
        if (field.component && typeof field.component.setValue === 'function') {
            field.component.setValue(value);
        } else {
            field.value = value;
        }
        
        return this;
    }

    /**
     * Validate a single field
     */
    validateField(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return true;
        
        const value = this.getFieldValue(fieldName);
        let isValid = true;
        let errorMessage = '';
        let warningMessage = '';
        
        // Run validators
        for (const validatorConfig of field.validators) {
            const { name, params } = this._parseValidatorConfig(validatorConfig);
            const validator = this.validators.get(name);
            
            if (!validator) {
                console.warn(`Validator '${name}' not found for field '${fieldName}'`);
                continue;
            }
            
            const result = validator(value, params, this);
            
            if (result !== true) {
                isValid = false;
                errorMessage = result;
                if (this.stopOnFirstError) break;
            }
        }
        
        // Run warning validators if field is valid
        if (isValid) {
            for (const warningConfig of field.warnings) {
                const { name, params } = this._parseValidatorConfig(warningConfig);
                const validator = this.validators.get(name);
                
                if (validator) {
                    const result = validator(value, params, this);
                    if (result !== true) {
                        warningMessage = result;
                        break; // Only show first warning
                    }
                }
            }
        }
        
        // Update error and warning state
        if (isValid) {
            this.errors.delete(fieldName);
        } else {
            this.errors.set(fieldName, errorMessage);
        }
        
        if (warningMessage) {
            this.warnings.set(fieldName, warningMessage);
        } else {
            this.warnings.delete(fieldName);
        }
        
        // Update component state if applicable
        if (field.component) {
            if (typeof field.component.setValid === 'function') {
                field.component.setValid(isValid);
            }
            if (typeof field.component.setValidationMessage === 'function') {
                field.component.setValidationMessage(errorMessage || warningMessage);
            }
        }
        
        // Trigger field validation callback
        if (this.onFieldValidation) {
            this.onFieldValidation({
                fieldName,
                value,
                valid: isValid,
                error: errorMessage,
                warning: warningMessage
            });
        }
        
        return isValid;
    }

    /**
     * Parse validator configuration
     */
    _parseValidatorConfig(config) {
        if (typeof config === 'string') {
            return { name: config, params: {} };
        } else if (typeof config === 'object') {
            const name = config.name || Object.keys(config)[0];
            const params = config.params || config[name] || {};
            return { name, params };
        }
        
        return { name: 'unknown', params: {} };
    }

    /**
     * Validate all fields
     */
    validate() {
        let isValid = true;
        const results = {};
        
        for (const fieldName of this.fields.keys()) {
            const fieldValid = this.validateField(fieldName);
            results[fieldName] = {
                valid: fieldValid,
                error: this.errors.get(fieldName),
                warning: this.warnings.get(fieldName)
            };
            
            if (!fieldValid) {
                isValid = false;
            }
        }
        
        // Trigger validation callback
        if (this.onValidation) {
            this.onValidation({
                valid: isValid,
                results,
                errors: Object.fromEntries(this.errors),
                warnings: Object.fromEntries(this.warnings)
            });
        }
        
        return isValid;
    }

    /**
     * Validate a specific group of fields
     */
    validateGroup(groupName) {
        const group = this.groups.get(groupName);
        if (!group) return true;
        
        let isValid = true;
        const results = {};
        
        for (const fieldName of group) {
            const fieldValid = this.validateField(fieldName);
            results[fieldName] = {
                valid: fieldValid,
                error: this.errors.get(fieldName),
                warning: this.warnings.get(fieldName)
            };
            
            if (!fieldValid) {
                isValid = false;
            }
        }
        
        return isValid;
    }

    /**
     * Get all form values
     */
    getValues() {
        const values = {};
        
        for (const fieldName of this.fields.keys()) {
            values[fieldName] = this.getFieldValue(fieldName);
        }
        
        return values;
    }

    /**
     * Set all form values
     */
    setValues(values) {
        for (const [fieldName, value] of Object.entries(values)) {
            this.setFieldValue(fieldName, value);
        }
        
        return this;
    }

    /**
     * Clear all form values
     */
    clearValues() {
        for (const fieldName of this.fields.keys()) {
            this.setFieldValue(fieldName, '');
        }
        
        return this;
    }

    /**
     * Reset form (clear values and errors)
     */
    reset() {
        this.clearValues();
        this.errors.clear();
        this.warnings.clear();
        
        // Clear component validation state
        for (const field of this.fields.values()) {
            if (field.component) {
                if (typeof field.component.setValid === 'function') {
                    field.component.setValid(true);
                }
                if (typeof field.component.setValidationMessage === 'function') {
                    field.component.setValidationMessage('');
                }
            }
        }
        
        return this;
    }

    /**
     * Check if form is valid
     */
    isValid() {
        return this.errors.size === 0;
    }

    /**
     * Get all errors
     */
    getErrors() {
        return Object.fromEntries(this.errors);
    }

    /**
     * Get all warnings
     */
    getWarnings() {
        return Object.fromEntries(this.warnings);
    }

    /**
     * Get error for specific field
     */
    getFieldError(fieldName) {
        return this.errors.get(fieldName);
    }

    /**
     * Get warning for specific field
     */
    getFieldWarning(fieldName) {
        return this.warnings.get(fieldName);
    }

    /**
     * Set custom error for field
     */
    setFieldError(fieldName, error) {
        if (error) {
            this.errors.set(fieldName, error);
        } else {
            this.errors.delete(fieldName);
        }
        
        const field = this.fields.get(fieldName);
        if (field && field.component) {
            if (typeof field.component.setValid === 'function') {
                field.component.setValid(!error);
            }
            if (typeof field.component.setValidationMessage === 'function') {
                field.component.setValidationMessage(error || '');
            }
        }
        
        return this;
    }

    /**
     * Submit form
     */
    submit() {
        if (this.validateOnSubmit) {
            const isValid = this.validate();
            if (!isValid) {
                return false;
            }
        }
        
        const values = this.getValues();
        
        if (this.onSubmit) {
            return this.onSubmit(values, this);
        }
        
        return true;
    }

    /**
     * Create a form validator with fluent API
     */
    static create(config = {}) {
        return new FormValidator(config);
    }

    /**
     * Create common validation rule sets
     */
    static rules = {
        email: () => [{ name: 'required' }, { name: 'email' }],
        password: (minLength = 8) => [
            { name: 'required' },
            { name: 'minLength', params: minLength },
            { name: 'password', params: { minLength } }
        ],
        passwordConfirm: (passwordField = 'password') => [
            { name: 'required' },
            { name: 'matches', params: { field: passwordField } }
        ],
        phone: () => [{ name: 'required' }, { name: 'phone' }],
        url: () => [{ name: 'url' }],
        number: (min, max) => {
            const rules = [{ name: 'required' }, { name: 'number' }];
            if (min !== undefined) rules.push({ name: 'min', params: min });
            if (max !== undefined) rules.push({ name: 'max', params: max });
            return rules;
        }
    };
}
