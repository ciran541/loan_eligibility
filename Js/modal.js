class IpaModal {
    constructor() {
        this.modal = document.getElementById('ipaModal');
        this.closeBtn = document.querySelector('.ipa-close');
        this.standardIpaButton = document.getElementById('standardIpaButton');
        this.alternativeIpaButton = document.getElementById('alternativeIpaButton');
        this.form = document.getElementById('ipaForm');
        this.selectedStructure = '';
        this.isInIframe = window !== window.parent;
        
        this.initializeEvents();
    }

    initializeEvents() {
        // Open modal events
        this.standardIpaButton.addEventListener('click', () => {
            this.selectedStructure = 'Structure 1 (75% LTV)';
            this.openModal();
        });
        
        this.alternativeIpaButton.addEventListener('click', () => {
            this.selectedStructure = 'Structure 2 (55% LTV)';
            this.openModal();
        });
        
        // Close modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    openModal() {
        if (this.isInIframe) {
            const headerText = document.querySelector('.ipa-header');
            if (headerText) {
                headerText.textContent = this.selectedStructure;
            }
            
            // Tell parent to adjust positioning
            window.parent.postMessage({
                type: 'showModal',
                position: {
                    top: window.pageYOffset
                }
            }, '*');
            
            // Show modal in iframe
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        } else {
            // Original behavior for direct viewing
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        if (this.isInIframe) {
            window.parent.postMessage({
                type: 'closeModal'
            }, '*');
        }
        
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.form.reset();
        this.clearErrors();
    }

    validateForm() {
        let isValid = true;
        const name = document.getElementById('name');
        const email = document.getElementById('emailAddress');
        const mobile = document.getElementById('mobileNumber');

        // Name validation
        if (!name.value.trim()) {
            this.showError(name, 'nameError', 'Name is required');
            isValid = false;
        }

        // Email validation
        if (!email.value.trim()) {
            this.showError(email, 'emailError', 'Email is required');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.value)) {
            this.showError(email, 'emailError', 'Please enter a valid email address');
            isValid = false;
        }

        // Mobile validation (Singapore format)
        if (!mobile.value.trim()) {
            this.showError(mobile, 'mobileError', 'Mobile number is required');
            isValid = false;
        } else if (!/^[89]\d{7}$/.test(mobile.value)) {
            this.showError(mobile, 'mobileError', 'Please enter a valid Singapore mobile number');
            isValid = false;
        }

        return isValid;
    }

    showError(input, errorId, message) {
        const errorElement = document.getElementById(errorId);
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearErrors() {
        document.querySelectorAll('.ipa-error').forEach(error => {
            error.style.display = 'none';
        });
        document.querySelectorAll('.ipa-input-group input').forEach(input => {
            input.classList.remove('error');
        });
    }

    getLoanDetails() {
        // Get prefix based on structure
        const prefix = this.selectedStructure.includes('75%') ? '' : 'alt-';
        
        // Get basic loan details
        const basicDetails = {
            structure: this.selectedStructure,
            targetPrice: document.getElementById(`${prefix}targetPrice`).textContent,
            maxLoanAmount: document.getElementById(`${prefix}maxBankLoan`).textContent,
            loanEligibility: document.getElementById(`${prefix}loanEligibility`).textContent,
            loanTenure: document.getElementById(`${prefix}loanTenure`).textContent,
            monthlyInstallment: document.getElementById(`${prefix}monthlyInstallment`).textContent,
            minCashDownpayment: document.getElementById(`${prefix}minCashDownpayment`).textContent,
            balanceDownpayment: document.getElementById(`${prefix}balanceDownpayment`).textContent,
            propertyType: document.querySelector('input[name="propertyType"]:checked').value,
            borrowerCount: document.querySelector('input[name="borrowerCount"]:checked').value,
        };
    
        // Get Borrower 1 details
        const borrower1Details = {
            borrower1_residency: document.querySelector('input[name="borrower1ResidencyStatus"]:checked').value,
            borrower1_age: document.getElementById('borrower1Age').value,
            borrower1_employment: document.querySelector('input[name="borrower1EmploymentStatus"]:checked').value,
            borrower1_salary: document.getElementById('borrower1BasicSalary').value,
            borrower1_bonus: document.getElementById('borrower1NOA').value,
            borrower1_commitments: document.getElementById('borrower1Commitments').value
        };
    
        // If joint application, get Borrower 2 details
        let borrower2Details = {};
        if (basicDetails.borrowerCount === 'joint') {
            borrower2Details = {
                borrower2_residency: document.querySelector('input[name="borrower2ResidencyStatus"]:checked').value,
                borrower2_age: document.getElementById('borrower2Age').value,
                borrower2_employment: document.querySelector('input[name="borrower2EmploymentStatus"]:checked').value,
                borrower2_salary: document.getElementById('borrower2BasicSalary').value,
                borrower2_bonus: document.getElementById('borrower2NOA').value,
                borrower2_commitments: document.getElementById('borrower2Commitments').value
            };
        }
    
        return {
            ...basicDetails,
            ...borrower1Details,
            ...borrower2Details
        };
    }

    // Add this method to your IpaModal class
showNotification() {
    const notification = document.getElementById('notification');
    notification.classList.add('show');
    
    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

async handleSubmit(e) {
    e.preventDefault();
    if (this.validateForm()) {
        const formData = new FormData(this.form);
        const loanDetails = this.getLoanDetails();
        
        // Combine form data and loan details
        const submissionData = {
            timestamp: new Date().toISOString(),
            name: formData.get('name'),
            email: formData.get('emailAddress'),
            mobile: formData.get('mobileNumber'),
            ...loanDetails
        };

        try {
            // Create a URL with parameters
            const scriptURL = 'https://script.google.com/macros/s/AKfycbyFm2j9tPOhV5f2PBZtgRtQLQq_De_ppJe_HNvSxGS2oKToBQ8Ujw6-0YTbw8yODoA/exec';
            
            // Send as form data instead of JSON
            const form = new FormData();
            Object.keys(submissionData).forEach(key => {
                form.append(key, submissionData[key]);
            });

            const response = await fetch(scriptURL, {
                method: 'POST',
                mode: 'no-cors', // This is key to avoid CORS issues
                body: form
            });

            // Close modal first
            this.closeModal();
            
            // Show notification
            const notification = document.getElementById('notification');
            notification.classList.add('show');
            
            // Hide notification after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
            
        } catch (error) {
            console.error('Error submitting form:', error);
            // Show error notification instead of alert
            const notification = document.getElementById('notification');
            const title = notification.querySelector('.notification-title');
            const description = notification.querySelector('.notification-description');
            const icon = notification.querySelector('.notification-icon');
            
            // Update notification content for error
            title.textContent = 'Error';
            description.textContent = 'Sorry, there was an error submitting your form. Please try again.';
            icon.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#EF4444" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>`;
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                // Reset notification content after hiding
                title.textContent = 'Success!';
                description.textContent = 'Thank you for your submission. Our team will contact you shortly.';
                icon.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>
                </svg>`;
            }, 5000);
        }
    }
}
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IpaModal();
});