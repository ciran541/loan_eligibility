class IpaModal {
    constructor() {
        this.modal = document.getElementById('ipaModal');
        this.closeBtn = document.querySelector('.ipa-close');
        this.standardIpaButton = document.getElementById('standardIpaButton');
        this.alternativeIpaButton = document.getElementById('alternativeIpaButton');
        this.bottomIpaButton = document.getElementById('bottomIpaButton');
        this.form = document.getElementById('ipaForm');
        this.submitBtn = this.form.querySelector('button[type="submit"]'); // Get submit button
        this.originalButtonText = this.submitBtn ? this.submitBtn.innerHTML : 'Submit'; // Store original text
        this.selectedStructure = '';
        this.isInIframe = window !== window.parent;
        this.trafficSource = this.getTrafficSource();
        
        // Ensure modal is hidden by default
        this.modal.style.display = 'none';
        
        this.initializeEvents();
    }

    getTrafficSource() {
        // First check URL parameters in the iframe
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');
        if (source) return source;

        // If we're in an iframe, try to get source from parent
        if (this.isInIframe) {
            try {
                const parentUrl = document.referrer;
                const parentParams = new URLSearchParams(new URL(parentUrl).search);
                const parentSource = parentParams.get('source');
                if (parentSource) return parentSource;
            } catch (e) {
                console.log('Unable to access parent URL parameters');
            }
        }

        // If no source found, check the referrer domain
        if (document.referrer) {
            try {
                const referrerDomain = new URL(document.referrer).hostname;
                if (referrerDomain.includes('theloanconnection.com.sg')) {
                    return 'website';
                }
            } catch (e) {
                console.log('Unable to parse referrer');
            }
        }

        return 'direct';
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

        // Add event listener for bottom IPA button
        this.bottomIpaButton.addEventListener('click', () => {
            this.selectedStructure = 'Structure 1 (75% LTV)';
            this.openModal();
        });
        
        // Close modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Handle mobile viewport adjustments only when modal is actually opened
        if (this.isInIframe) {
            window.addEventListener('resize', () => this.handleResize());
        }
    }

    handleResize() {
        // Only adjust position if modal is actually visible
        if (this.modal.style.display === 'block') {
            this.adjustModalPosition();
        }
    }

    adjustModalPosition() {
        const modalContent = this.modal.querySelector('.ipa-modal-content');
        
        if (window.innerWidth <= 768) { // Mobile view
            // Apply mobile styles only when modal is actually open
            if (this.modal.style.display === 'block') {
                this.modal.style.top = '0';
                this.modal.style.height = '100%';
                this.modal.style.overflow = 'auto';
                
                if (modalContent) {
                    modalContent.style.marginTop = '20px';
                    modalContent.style.marginBottom = '20px';
                    modalContent.style.maxHeight = 'none';
                }
            }
        } else {
            // Reset styles for desktop view
            this.modal.style.top = '';
            this.modal.style.height = '';
            this.modal.style.overflow = '';
            
            if (modalContent) {
                modalContent.style.marginTop = '';
                modalContent.style.marginBottom = '';
                modalContent.style.maxHeight = '';
            }
        }
    }

    openModal() {
        if (this.isInIframe) {
            const headerText = document.querySelector('.ipa-header');
            if (headerText) {
                headerText.textContent = this.selectedStructure;
            }
            
            window.parent.postMessage({
                type: 'showModal'
            }, '*');
            
            // Set display before adjusting position
            this.modal.style.display = 'block';
            // Only adjust position after setting display
            this.adjustModalPosition();
        } else {
            this.modal.style.display = 'block';
        }
    }

    closeModal() {
        if (this.isInIframe) {
            window.parent.postMessage({
                type: 'closeModal'
            }, '*');
        }
        
        // Reset all modal styles when closing
        this.modal.style.display = 'none';
        const modalContent = this.modal.querySelector('.ipa-modal-content');
        if (modalContent) {
            modalContent.style.marginTop = '';
            modalContent.style.marginBottom = '';
            modalContent.style.maxHeight = '';
        }
        
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
    showNotification(type = 'success', title = 'Success!', message = 'Thank you! Your report is being processed and will arrive in your email shortly.') {
        // Instead of showing notification in iframe, send message to parent
        if (this.isInIframe) {
            window.parent.postMessage({
                type: 'showNotification',
                notification: {
                    type: type,
                    title: title,
                    message: message,
                    icon: type === 'success' ? 
                        `<svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>
                        </svg>` :
                        `<svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="#EF4444" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>`
                }
            }, '*');
        }
    }

showLoading() {
    if (this.submitBtn) {
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = 'Almost there! Preparing your report...';
    }
}

hideLoading() {
    if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitBtn.innerHTML = this.originalButtonText;
    }
}


async handleSubmit(e) {
    e.preventDefault();
    if (this.validateForm()) {
        this.showLoading();

        try {
            const formData = new FormData(this.form);
            const loanDetails = this.getLoanDetails();
            const userName = formData.get('name');
            const userEmail = formData.get('emailAddress');
            
            // Create temporary container
            const captureContainer = document.createElement('div');
            captureContainer.className = 'pdf-capture-container';
            
            captureContainer.innerHTML = `
            <div class="pdf-header">
                <div class="company-info">
                    <h1>The Loan Connection</h1>
                    <h2>Getting The Right Mortgage</h2> <!-- Retaining the tagline for brand consistency -->
                </div>
                <div class="user-info">
                    <p><strong>Prepared for:</strong> ${userName || 'Valued Customer'}</p>
                    <p><strong>Email:</strong> ${userEmail || 'N/A'}</p>
                    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
            </div>
        `;
            // Clone results section
            const resultsSection = document.querySelector('.results-wrapper');
            const resultsClone = resultsSection.cloneNode(true);

            // Function to capture chart as image
            const captureChart = (chartId) => {
                const originalChart = document.getElementById(chartId);
                if (originalChart) {
                    const chartInstance = Chart.getChart(originalChart);
                    if (chartInstance) {
                        const chartImage = chartInstance.toBase64Image();
                        const clonedCanvas = resultsClone.querySelector(`#${chartId}`);
                        if (clonedCanvas) {
                            const img = document.createElement('img');
                            img.src = chartImage;
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
                        }
                    }
                }
            };

            // Capture both charts
            captureChart('standardLoanChart');
            captureChart('alternativeLoanChart');

            // Make all elements visible
            resultsClone.querySelectorAll('*').forEach(el => {
                if (window.getComputedStyle(el).display === 'none') {
                    el.style.display = 'block';
                }
            });
            
            captureContainer.appendChild(resultsClone);
            
            captureContainer.innerHTML += `
            <div class="pdf-footer">
                <hr>
                <p>This report was generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p>For any questions, please contact our mortgage specialists at <a href="mailto:hello@theloanconnection.com.sg">hello@theloanconnection.com.sg</a></p>
            </div>
        `;
            
            // Add to document for capture
            document.body.appendChild(captureContainer);
            
            // Use original dimensions
            const width = Math.max(resultsClone.scrollWidth, 800);
            const height = Math.max(resultsClone.scrollHeight + 200, 4500);
            
            captureContainer.style.width = `${width}px`;
            
            // Capture content
            const canvas = await html2canvas(captureContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: width,
                height: height,
                windowWidth: width,
                windowHeight: height
            });
            
            // Remove temporary container
            document.body.removeChild(captureContainer);
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [width, height]
            });
            
            // Add captured content to PDF
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, 0, width, height, '', 'FAST');
            
            // Get base64 for submission
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            
            // Prepare submission data
            const submissionData = {
                timestamp: new Date().toISOString(),
                name: formData.get('name'),
                email: formData.get('emailAddress'),
                mobile: formData.get('mobileNumber'),
                pdfData: pdfBase64,
                source: this.trafficSource,
                ...loanDetails
            };

            // Submit to Google Apps Script
            const scriptURL = 'https://script.google.com/macros/s/AKfycbwmk392IM5mH_lWQLf01Nb0vT3r3OoTjM3HtL-QINn3F7_X7RpHlIiVFrhBo-7CdYBh/exec';
            const form = new FormData();
            
            Object.keys(submissionData).forEach(key => {
                form.append(key, submissionData[key]);
            });

            const response = await fetch(scriptURL, {
                method: 'POST',
                mode: 'no-cors',
                body: form
            });

            this.hideLoading();
            this.closeModal();
            
            this.showNotification(
                'success', 
                'Success!', 
                'Thank you! Your report is being processed and will arrive in your email shortly.'
            );
            
        } catch (error) {
            console.error('Error submitting form:', error);
            this.hideLoading();
            
            this.showNotification(
                'error',
                'Error',
                'Sorry, there was an error submitting your form. Please try again.'
            );
        }
    }
}
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
new IpaModal();
});