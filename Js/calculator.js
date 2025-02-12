class LoanCalculator {
    constructor() {
        this.form = document.getElementById('loanCalculatorForm');
        this.standardResults = document.getElementById('standardResults');
        this.alternativeResults = document.getElementById('alternativeResults');
        this.borrower2Section = document.getElementById('borrower2Details');
        this.conditionalResults = document.getElementById('conditionalResults');
        
        // Standard parameters (75% LTV)
        this.STANDARD_PARAMS = {
            MAX_LOAN_PERCENTAGE: 0.75,
            MAX_AGE_LIMIT: 65,
            TENURE_PRIVATE: 30,
            TENURE_HDB: 25,
            MIN_CASH_PERCENTAGE: 0.05
        };

        // Alternative parameters (55% LTV)
        this.ALTERNATIVE_PARAMS = {
            MAX_LOAN_PERCENTAGE: 0.55,
            MAX_AGE_LIMIT: 75,
            TENURE_PRIVATE: 35,
            TENURE_HDB: 30,
            MIN_CASH_PERCENTAGE: 0.10
        };

        // Initialize chart instances
    this.standardChart = this.initializeChart('standardLoanChart');
    this.alternativeChart = this.initializeChart('alternativeLoanChart');

        // Common constants for calculations
        this.STRESS_TEST_RATE = 0.040; // 4.2% annual interest rate
        this.MONTHLY_INSTALLMENT_RATE = 0.025; // 2.5% annual interest rate for monthly installment
        this.MSR_LIMIT = 0.30; // 30% for MSR
        this.TDSR_LIMIT = 0.55; // 55% for TDSR
        this.NOA_FACTOR = 0.7; // 70% of NOA income considered

        // Store field values for each borrower and employment status
        this.savedFields = {
            borrower1: {
                employed: {
                    basicSalary: '',
                    noa: ''
                },
                selfEmployed: {
                    basicSalary: '',
                    noa: ''
                }
            },
            borrower2: {
                employed: {
                    basicSalary: '',
                    noa: ''
                },
                selfEmployed: {
                    basicSalary: '',
                    noa: ''
                }
            }
        };

        // new property for label texts
        this.LABEL_TEXTS = {
            employed: 'Annual Bonus',
            selfEmployed: 'Annual Income'
        };

        // Track touched fields for validation
        this.touchedFields = new Set();

        this.initializeFormState();
        this.updateBorrowerTitles();
        this.initializeEventListeners();
        this.calculateLoanEligibility();
        this.initializeNoaLabels();
    }

    // new method to initialize NOA labels
    initializeNoaLabels() {
        ['borrower1', 'borrower2'].forEach(borrower => {
            this.updateNoaLabel(borrower);
        });
    }

    // Add new method for title updates
    updateBorrowerTitles() {
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        const borrower1Title = document.querySelector('#borrower1Details h2');
        
        if (borrower1Title) {
            borrower1Title.textContent = isSingle ? 'Income Details' : 'Borrower 1\'s Income Details';
        }
    }


    // new method to update NOA label
    updateNoaLabel(borrower) {
        const employmentStatus = document.querySelector(`input[name="${borrower}EmploymentStatus"]:checked`).value;
        const noaLabel = document.getElementById(`${borrower}NoaLabel`);
        
        if (noaLabel) {
            noaLabel.textContent = this.LABEL_TEXTS[employmentStatus];
        }
    }

    initializeHdbForeignerValidation() {
        // Listen for property type changes
        document.querySelectorAll('input[name="propertyType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateForeignerOptions(e.target.value === 'hdb');
            });
        });
    
        // Initial state setup
        const isHdb = document.querySelector('input[name="propertyType"][value="hdb"]').checked;
        this.updateForeignerOptions(isHdb);
    }
    
    updateForeignerOptions(isHdb) {
        // Get all foreigner radio buttons for both borrowers
        const foreignerOptions = document.querySelectorAll('input[name="borrower1ResidencyStatus"][value="foreigner"], input[name="borrower2ResidencyStatus"][value="foreigner"]');
        
        foreignerOptions.forEach(option => {
            // If HDB is selected, disable foreigner options and select Singaporean if foreigner was selected
            if (isHdb) {
                if (option.checked) {
                    // If foreigner was selected, switch to Singaporean
                    const singaporeanOption = document.querySelector(`input[name="${option.name}"][value="singaporean"]`);
                    if (singaporeanOption) {
                        singaporeanOption.checked = true;
                    }
                }
                option.disabled = true;
                option.parentElement.style.opacity = '0.5';
            } else {
                // If not HDB, enable foreigner options
                option.disabled = false;
                option.parentElement.style.opacity = '1';
            }
        });
    }

initializeFormState() {
    // Your existing code stays the same
    this.borrower2Section.classList.add('hidden');
    
    // Hide all error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.style.display = 'none';
    });

    // Remove required from Borrower 2 fields
    this.borrower2Section.querySelectorAll('input').forEach(input => {
        input.required = false;
    });

    // Hide conditional results
    this.conditionalResults.classList.add('hidden');

    // Clear all error states
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });

    // Add this new line
    this.initializeHdbForeignerValidation();
}

    initializeEventListeners() {
        // Property Type Changes
        document.querySelectorAll('input[name="propertyType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updatePropertyTenure(e.target.value);
                if (this.validateForm()) {
                    this.calculateLoanEligibility();
                }
            });
        });

        // Initialize property tenure text
        this.updatePropertyTenure(document.querySelector('input[name="propertyType"]:checked').value);

        // Borrower Count Changes
        document.querySelectorAll('input[name="borrowerCount"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleBorrower2Fields();
                if (this.validateForm()) {
                    this.calculateLoanEligibility();
                }
            });
        });

        // Employment Status Changes
        ['borrower1', 'borrower2'].forEach(borrower => {
            document.querySelectorAll(`input[name="${borrower}EmploymentStatus"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.toggleEmploymentFields(borrower, e.target.value);
                    this.updateNoaLabel(borrower);
                    if (this.validateForm()) {
                        this.calculateLoanEligibility();
                    }
                });
            });
        });

        // Input field validation
        this.form.querySelectorAll('input').forEach(input => {
            input.addEventListener('focus', () => {
                this.touchedFields.add(input.id);
            });

            input.addEventListener('input', () => {
                if (this.touchedFields.has(input.id)) {
                    this.validateInput(input);
                    if (this.validateForm()) {
                        this.calculateLoanEligibility();
                    }
                }
            });

            input.addEventListener('blur', () => {
                this.touchedFields.add(input.id);
                this.validateInput(input);
                if (this.validateForm()) {
                    this.calculateLoanEligibility();
                }
            });
        });
        // Add this new code for residency status changes
    ['borrower1', 'borrower2'].forEach(borrower => {
        document.querySelectorAll(`input[name="${borrower}ResidencyStatus"]`).forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.validateForm()) {
                    this.calculateLoanEligibility();
                }
            });
        });
    });

        // Add this to the property type event listeners
    document.querySelectorAll('input[name="propertyType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            this.updatePropertyTenure(e.target.value);
            this.updateMiscCosts('');     // Update standard results
            this.updateMiscCosts('alt-'); // Update alternative results
            if (this.validateForm()) {
                this.calculateLoanEligibility();
            }
        });
    });
    }

    toggleBorrower2Fields() {
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        this.borrower2Section.classList.toggle('hidden', isSingle);
        
        // Update section titles
        this.updateBorrowerTitles();
        
        // Update required attributes for Borrower 2 fields
        this.borrower2Section.querySelectorAll('input').forEach(input => {
            input.required = !isSingle;
            if (isSingle) {
                input.value = '';
                input.classList.remove('error');
                const errorElement = document.getElementById(`${input.id}Error`);
                if (errorElement) {
                    errorElement.style.display = 'none';
                }
            }
        });
    }

    toggleEmploymentFields(borrower, status) {
        // Save current values before toggling
        this.saveFieldValues(borrower);

        const basicSalaryGroup = document.getElementById(`${borrower}BasicSalaryGroup`);
        const noaGroup = document.getElementById(`${borrower}NoaGroup`);
        const basicSalaryInput = document.getElementById(`${borrower}BasicSalary`);
        const noaInput = document.getElementById(`${borrower}NOA`);
        const noaLabel = document.getElementById(`${borrower}NoaLabel`);

        if (status === 'employed') {
            basicSalaryGroup.classList.remove('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = true;
            noaInput.required = false;
            if (noaLabel) {
                noaLabel.textContent = this.LABEL_TEXTS.employed;
            }
        } else {
            basicSalaryGroup.classList.add('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = false;
            noaInput.required = true;
            if (noaLabel) {
                noaLabel.textContent = this.LABEL_TEXTS.selfEmployed;
            }
        }

        // Restore saved values for the selected status
        this.restoreFieldValues(borrower, status);
    }

    saveFieldValues(borrower) {
        const currentStatus = document.querySelector(`input[name="${borrower}EmploymentStatus"]:checked`).value;
        const basicSalary = document.getElementById(`${borrower}BasicSalary`).value;
        const noa = document.getElementById(`${borrower}NOA`).value;

        this.savedFields[borrower][currentStatus === 'employed' ? 'employed' : 'selfEmployed'] = {
            basicSalary: basicSalary,
            noa: noa
        };
    }

    restoreFieldValues(borrower, newStatus) {
        const savedValues = this.savedFields[borrower][newStatus === 'employed' ? 'employed' : 'selfEmployed'];
        
        const basicSalaryInput = document.getElementById(`${borrower}BasicSalary`);
        const noaInput = document.getElementById(`${borrower}NOA`);

        if (savedValues) {
            basicSalaryInput.value = savedValues.basicSalary;
            noaInput.value = savedValues.noa;
        }

        // Clear validation errors if any
        basicSalaryInput.classList.remove('error');
        noaInput.classList.remove('error');
        const basicSalaryError = document.getElementById(`${borrower}BasicSalaryError`);
        const noaError = document.getElementById(`${borrower}NOAError`);
        if (basicSalaryError) basicSalaryError.style.display = 'none';
        if (noaError) noaError.style.display = 'none';
    }

    validateInput(input) {
        if (!this.touchedFields.has(input.id)) {
            return true;
        }

        const isValid = input.checkValidity();
        input.classList.toggle('error', !isValid);
        
        const errorElement = document.getElementById(`${input.id}Error`);
        if (errorElement) {
            if (!isValid) {
                let errorMessage = '';
                if (input.validity.valueMissing) {
                    errorMessage = 'This field is required';
                } else if (input.validity.rangeUnderflow) {
                    errorMessage = `Minimum value is ${input.min}`;
                } else if (input.validity.rangeOverflow) {
                    errorMessage = `Maximum value is ${input.max}`;
                } else {
                    errorMessage = input.validationMessage;
                }
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
        }
        
        return isValid;
    }

    validateForm() {
        if (!this.form.checkValidity()) {
            return false;
        }

        let isValid = true;
        this.form.querySelectorAll('input:required').forEach(input => {
            if (!this.isFieldVisible(input)) {
                return;
            }
            
            if (this.touchedFields.has(input.id)) {
                if (!this.validateInput(input)) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    isFieldVisible(input) {
        let element = input;
        while (element && element !== this.form) {
            if (element.classList.contains('hidden')) {
                return false;
            }
            element = element.parentElement;
        }
        return true;
    }

    calculateBorrowerIncome(borrower) {
        const isEmployed = document.querySelector(`input[name="${borrower}EmploymentStatus"][value="employed"]`)?.checked;
        const basicSalary = parseFloat(document.getElementById(`${borrower}BasicSalary`)?.value || 0);
        const noa = parseFloat(document.getElementById(`${borrower}NOA`)?.value || 0);
        
        if (isEmployed) {
            // For employed: Basic Salary + (NOA × 0.7 / 12)
            return basicSalary + (noa * this.NOA_FACTOR / 12);
        } else {
            // For self-employed: (NOA × 0.7 / 12)
            return (noa * this.NOA_FACTOR / 12);
        }
    }

    // Add these methods to the LoanCalculator class

calculateLegalFee(propertyType) {
    return propertyType === 'hdb' ? 1800 : 2500;
}

calculateValuationFee(propertyType, propertyValue) {
    if (propertyType === 'hdb') {
        return 120;
    }
    
    // For private property
    if (propertyValue < 1000000) {
        return 300;
    } else if (propertyValue < 2000000) {
        return 400;
    } else if (propertyValue < 3000000) {
        return 500;
    } else {
        return 500; // Base fee for 3M onwards
    }
}

// Add this method to calculate BSD
calculateBSD(propertyValue) {
    let bsd = 0;

    // First $180k @ 1%
    if (propertyValue <= 180000) {
        return propertyValue * 0.01;
    }
    bsd += 180000 * 0.01; // $1,800

    // $180k to $360k @ 2%
    if (propertyValue <= 360000) {
        return bsd + (propertyValue - 180000) * 0.02;
    }
    bsd += 180000 * 0.02; // $3,600

    // $360k to $1m @ 3%
    if (propertyValue <= 1000000) {
        return bsd + (propertyValue - 360000) * 0.03;
    }
    bsd += 640000 * 0.03; // $19,200

    // $1m to $1.5m @ 4%
    if (propertyValue <= 1500000) {
        return bsd + (propertyValue - 1000000) * 0.04;
    }
    bsd += 500000 * 0.04; // $20,000

    // $1.5m to $3m @ 5%
    if (propertyValue <= 3000000) {
        return bsd + (propertyValue - 1500000) * 0.05;
    }
    bsd += 1500000 * 0.05; // $75,000

    // Above $3m @ 6%
    bsd += (propertyValue - 3000000) * 0.06;

    return bsd;
}
// Add this method to calculate ABSD
calculateABSD(propertyValue) {
    const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
    
    // Get residency status for borrower 1
    const borrower1Status = document.querySelector('input[name="borrower1ResidencyStatus"]:checked').value;
    
    // For single borrower
    if (isSingle) {
        if (borrower1Status === 'foreigner') {
            return propertyValue * 0.60; // 60% for foreigner
        } else if (borrower1Status === 'permanentResident') {
            return propertyValue * 0.05; // 5% for PR
        }
        return 0; // 0% for Singaporean
    }
    
    // For joint application, get borrower 2's status
    const borrower2Status = document.querySelector('input[name="borrower2ResidencyStatus"]:checked').value;
    
    // If either borrower is a foreigner
    if (borrower1Status === 'foreigner' || borrower2Status === 'foreigner') {
        return propertyValue * 0.60; // 60% if any foreigner
    }
    
    // If either borrower is PR (and no foreigner)
    if (borrower1Status === 'permanentResident' || borrower2Status === 'permanentResident') {
        return propertyValue * 0.05; // 5% if any PR
    }
    
    // Both are Singaporeans
    return 0;
}

// Modify the updateMiscCosts method to handle the special display with inline italic styling
updateMiscCosts(prefix = '') {
    const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
    const propertyValue = parseFloat(document.getElementById('propertyValue').value);
    
    // Calculate fees
    const legalFee = this.calculateLegalFee(propertyType);
    const valuationFee = this.calculateValuationFee(propertyType, propertyValue);
    const bsd = this.calculateBSD(propertyValue);
    const absd = this.calculateABSD(propertyValue);
    
    // Update display
    const formatCurrency = (number) => `SGD ${Math.round(number).toLocaleString()}`;
    
    document.getElementById(`${prefix}legalFee`).textContent = formatCurrency(legalFee);
    
    // Special handling for valuation fee display with inline italic onwards text
    const valuationFeeElement = document.getElementById(`${prefix}valuationFee`);
    if (propertyValue >= 2000000) {
        valuationFeeElement.innerHTML = `${formatCurrency(valuationFee)}&nbsp;<span style="font-size: 0.8em; color: #666666; font-style: italic; display: inline;">Onwards</span>`;
    } else {
        valuationFeeElement.textContent = formatCurrency(valuationFee);
    }
    
    document.getElementById(`${prefix}buyerStampDuty`).textContent = formatCurrency(bsd);
    document.getElementById(`${prefix}absd`).textContent = formatCurrency(absd);
}

    calculateTotalIncome() {
        const borrower1Income = this.calculateBorrowerIncome('borrower1');
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        return isSingle ? borrower1Income : borrower1Income + this.calculateBorrowerIncome('borrower2');
    }

    calculateWeightedAverageAge() {
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        const borrower1Age = parseInt(document.getElementById('borrower1Age').value) || 0;
        const borrower1Income = this.calculateBorrowerIncome('borrower1');

        if (isSingle) {
            return borrower1Age;
        }

        const borrower2Age = parseInt(document.getElementById('borrower2Age').value) || 0;
        const borrower2Income = this.calculateBorrowerIncome('borrower2');
        const totalIncome = borrower1Income + borrower2Income;

        return Math.ceil(((borrower1Age * borrower1Income) + (borrower2Age * borrower2Income)) / totalIncome);
    }

    calculateTotalCommitments() {
        const borrower1Commitments = parseFloat(document.getElementById('borrower1Commitments').value || 0);
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        const borrower2Commitments = isSingle ? 0 : parseFloat(document.getElementById('borrower2Commitments').value || 0);
        return borrower1Commitments + borrower2Commitments;
    }

    calculatePV(rate, nper, pmt) {
        const monthlyRate = rate;
        return Math.abs(pmt) * (1 - Math.pow(1 + monthlyRate, -nper)) / monthlyRate;
    }

    calculateLoanTenureWithParams(params) {
        const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
        const weightedAge = this.calculateWeightedAverageAge();
        const maxPropertyTenure = propertyType === 'hdb' ? params.TENURE_HDB : params.TENURE_PRIVATE;
        return Math.min(params.MAX_AGE_LIMIT - weightedAge, maxPropertyTenure);
    }

    calculateResultsWithParams(params) {
        try {
            const propertyValue = parseFloat(document.getElementById('propertyValue').value);
            const totalIncome = this.calculateTotalIncome();
            const totalCommitments = this.calculateTotalCommitments();
            const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
            const tenure = this.calculateLoanTenureWithParams(params);
    
            // Calculate TDSR and MSR available
            const tdsrAvailable = Math.max((totalIncome * this.TDSR_LIMIT) - totalCommitments, 0);
            const msrAvailable = totalIncome * this.MSR_LIMIT;
            
            // Determine monthly payment capacity
            const monthlyPayment = (propertyType === 'hdb') ? 
                Math.min(msrAvailable, tdsrAvailable) : tdsrAvailable;
    
            // Calculate pure income-based loan eligibility using stress test rate
            const stressMonthlyRate = this.STRESS_TEST_RATE / 12;
            const monthsTotal = tenure * 12;
            const pureIncomeBasedEligibility = this.calculatePV(stressMonthlyRate, monthsTotal, monthlyPayment);
    
            // Calculate maximum possible loan based on property value
            const maxPossibleLoan = propertyValue * params.MAX_LOAN_PERCENTAGE;
    
            // Calculate actual monthly installment using the final loan amount
            const actualMonthlyRate = this.MONTHLY_INSTALLMENT_RATE / 12;
            const actualMonthlyPayment = pureIncomeBasedEligibility > 0 ? 
                Math.abs(pureIncomeBasedEligibility * actualMonthlyRate * 
                    Math.pow(1 + actualMonthlyRate, monthsTotal) / 
                    (Math.pow(1 + actualMonthlyRate, monthsTotal) - 1)) : 0;
    
            // Calculate loan percentage based on pure eligibility vs property value
            const loanPercentage = (pureIncomeBasedEligibility / propertyValue) * 100;
    
            // Calculate pledge funds
            let pledgeFundData = null;
            if (pureIncomeBasedEligibility < maxPossibleLoan) {
                const shortfall = maxPossibleLoan - pureIncomeBasedEligibility;
                if (shortfall > 1) {
                    let shortfallPayment;
                    if (pureIncomeBasedEligibility === 0) {
                        // Calculate monthly payment needed for the full shortfall amount
                        shortfallPayment = shortfall * 
                            (stressMonthlyRate * Math.pow(1 + stressMonthlyRate, monthsTotal)) / 
                            (Math.pow(1 + stressMonthlyRate, monthsTotal) - 1);
                    } else {
                        // Use existing ratio method when there is some income-based eligibility
                        shortfallPayment = monthlyPayment * (shortfall / pureIncomeBasedEligibility);
                    }
    
                    const pledgeDivisor = propertyType === 'hdb' ? 0.30 : 0.55;
                    const pledgeFund = Math.max(0, (shortfallPayment * 48) / pledgeDivisor);
                    const showFund = Math.max(0, pledgeFund / 0.3);
    
                    if (pledgeFund > 1 && showFund > 1) {
                        pledgeFundData = { pledgeFund, showFund };
                    }
                }
            }
    
            return {
                weightedAge: this.calculateWeightedAverageAge(),
                loanTenure: tenure,
                propertyValue: propertyValue,
                pureIncomeBasedEligibility: pureIncomeBasedEligibility,
                monthlyInstallment: actualMonthlyPayment,
                maxLoanPercentage: params.MAX_LOAN_PERCENTAGE,
                pledgeFundData: pledgeFundData,
                maxPossibleLoan: maxPossibleLoan
            };
        } catch (error) {
            console.error('Error calculating results:', error);
            return null;
        }
    }

    calculateLoanEligibility() {
        // Calculate results for both parameter sets
        const standardResults = this.calculateResultsWithParams(this.STANDARD_PARAMS);
        const alternativeResults = this.calculateResultsWithParams(this.ALTERNATIVE_PARAMS);

        // Update both results sections
        if (standardResults) {
            this.updateResults(standardResults, 'standard');
        }

        if (alternativeResults) {
            this.updateResults(alternativeResults, 'alternative');
        }
    }

    initializeChart(canvasId) {
        const formatCurrency = (value) => {
            return `$ ${Math.floor(value).toLocaleString()}`;
        };
    
        // Determine if this is the standard or alternative chart based on canvas ID
        const isStandard = canvasId === 'standardLoanChart';
        const percentage = isStandard ? '(75%)' : '(55%)';
    
        const centerTextPlugin = {
            id: 'centerText',
            afterDraw: (chart) => {
                const { ctx, chartArea: {left, top, right, bottom} } = chart;
                const centerX = (left + right) / 2;
                const centerY = (top + bottom) / 2;
                
                // Get actual monetary values instead of percentages
                const currentAmount = chart.data.datasets[0].data[1];
                const maxAmount = chart.data.datasets[0].data[0] + currentAmount;
                
                ctx.restore();
                
                // Draw current amount (larger, primary color)
                ctx.font = '700 20px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#1EA8E0';
                ctx.fillText(formatCurrency(currentAmount), centerX, centerY - 20);
                
                // Draw separator line
                ctx.beginPath();
                ctx.moveTo(centerX - 40, centerY - 4);
                ctx.lineTo(centerX + 40, centerY - 4);
                ctx.strokeStyle = '#CBD5E1';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw max amount (smaller, secondary color)
                ctx.font = '500 14px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#64748B';
                ctx.fillText(formatCurrency(maxAmount), centerX, centerY + 16);
                
                // Draw structure percentage
                ctx.font = '500 12px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#64748B';
                ctx.fillText(percentage, centerX, centerY + 32);
                
                ctx.save();
            }
        };
    
        const chart = new Chart(document.getElementById(canvasId), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(230, 80, 60, 0.75)',
                        '#1EA8E0'
                    ],
                    borderWidth: 0,
                    borderRadius: 12,
                    spacing: 4,
                    hoverOffset: 0
                }]
            },
            options: {
                cutout: '85%',
                radius: '95%',
                responsive: true,
                maintainAspectRatio: true,
                rotation: 90,
                circumference: 360,
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeOutElastic'
                },
                hover: {
                    mode: null
                },
                layout: {
                    padding: 20
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,
                        external: (context) => {
                            // Remove previous tooltip
                            const tooltipEl = document.getElementById('chartjs-tooltip');
                            if (tooltipEl) {
                                tooltipEl.remove();
                            }
    
                            // Abort if no tooltip
                            const tooltipModel = context.tooltip;
                            if (tooltipModel.opacity === 0) {
                                return;
                            }
    
                            // Create new tooltip div
                            const newTooltipEl = document.createElement('div');
                            newTooltipEl.id = 'chartjs-tooltip';
    
                            // Set tooltip content
                            const value = tooltipModel.dataPoints[0].raw;
                            newTooltipEl.innerHTML = formatCurrency(value);
    
                            // Position tooltip
                            const position = context.chart.canvas.getBoundingClientRect();
                            
                            // Calculate center of the chart
                            const chartCenterX = position.left + position.width / 2;
                            const chartCenterY = position.top + position.height / 2;
                            
                            // Calculate angle for current segment
                            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
                            const dataset = context.chart.data.datasets[0];
                            const total = dataset.data.reduce((a, b) => a + b, 0);
                            
                            // Start from -90 degrees (top) and adjust for rotation
                            const startAngle = -Math.PI/2 + dataset.data
                                .slice(0, dataIndex)
                                .reduce((a, b) => a + (b / total) * Math.PI * 2, 0);
                                
                            // Get the middle angle of the segment
                            const segmentAngle = (dataset.data[dataIndex] / total) * Math.PI * 2;
                            const angle = startAngle + (segmentAngle / 2);
                            
                            // Position tooltip outside the chart
                            const radius = position.width / 2 + 20; // 20px outside the chart
                            const tooltipX = chartCenterX + Math.cos(angle) * radius;
                            const tooltipY = chartCenterY + Math.sin(angle) * radius;
    
                            // Add styles to tooltip
                            newTooltipEl.style.backgroundColor = 'white';
                            newTooltipEl.style.padding = '8px 12px';
                            newTooltipEl.style.border = '1px solid #ddd';
                            newTooltipEl.style.borderRadius = '4px';
                            newTooltipEl.style.position = 'absolute';
                            newTooltipEl.style.transform = 'translate(-50%, -50%)';
                            newTooltipEl.style.left = tooltipX + 'px';
                            newTooltipEl.style.top = tooltipY + 'px';
                            newTooltipEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
                            // Add tooltip to document
                            document.body.appendChild(newTooltipEl);
                        }
                    }
                }
            },
            plugins: [centerTextPlugin]
        });
    
        // Add subtle shadow effect
        const canvas = document.getElementById(canvasId);
        canvas.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))';
    
        return chart;
    }
    
    updateChart(chart, loanAmount, maxAmount) {
        const animation = {
            duration: 1000,
            easing: 'easeOutElastic',
            animateScale: true,
            animateRotate: true
        };
    
        // Calculate the shortfall (difference between max and current)
        const shortfall = maxAmount - loanAmount;
    
        // Update with actual monetary values
        chart.data.datasets[0].data = [shortfall, loanAmount];
        chart.options.rotation = 0;
        chart.update(animation);
    }
    
    updateResults(results, type) {
        const prefix = type === 'standard' ? '' : 'alt-';
        const formatCurrency = (number) => `SGD ${Math.floor(number).toLocaleString()}`;
        const formatPercentage = (number) => {
            const roundedNum = Math.round(number * 100) / 100;
            if (roundedNum === 55 || roundedNum === 75 || number === 0.55 || number === 0.75) {
                return `${Math.round(number)}%`;
            }
            return `${number.toFixed(2)}%`;
        };
        
        const params = type === 'standard' ? this.STANDARD_PARAMS : this.ALTERNATIVE_PARAMS;
        this.updateMiscCosts(prefix);
        
        // Always show pure income-based eligibility first
        const pureIncomeBasedEligibility = results.pureIncomeBasedEligibility;
        
        // Calculate property-based maximum (this is the theoretical maximum)
        const theoreticalMaxLoan = results.maxPossibleLoan;
        
        // Final loan amount is lower of income-based eligibility or property-based maximum
        const finalLoanAmount = Math.min(pureIncomeBasedEligibility, theoreticalMaxLoan);
        
        // Calculate actual achievable LTV percentage
        const actualLTV = (finalLoanAmount / results.propertyValue) * 100;
        
        // Calculate downpayments
        const minCashDownpayment = results.propertyValue * params.MIN_CASH_PERCENTAGE;
        const balanceDownpayment = results.propertyValue - (finalLoanAmount + minCashDownpayment);
        const balanceDownpaymentPercentage = 100 - (params.MIN_CASH_PERCENTAGE * 100) - actualLTV;
    
        // Calculate loan shortfall from theoretical maximum
        const loanShortfall = theoreticalMaxLoan - finalLoanAmount;
        
        // Update chart
        const chart = type === 'standard' ? this.standardChart : this.alternativeChart;
        this.updateChart(chart, finalLoanAmount, theoreticalMaxLoan);
        
        // Update basic result fields
        document.getElementById(`${prefix}targetPrice`).textContent = formatCurrency(results.propertyValue);
        
        // Update maxBankLoan to show actual achievable amount and LTV with blue percentage
        const maxBankLoanLabel = document.querySelector(`label[for="${prefix}maxBankLoan"]`) || 
                                document.getElementById(`${prefix}maxBankLoan`).previousElementSibling;
        maxBankLoanLabel.innerHTML = `Maximum Loan-To-Valuation (<span style="color: #1EA8E0; display: inline; font-size: inherit; font-weight: inherit;">LTV-${formatPercentage(actualLTV)}</span>):`;
        document.getElementById(`${prefix}maxBankLoan`).textContent = formatCurrency(finalLoanAmount);
        
        document.getElementById(`${prefix}loanTenure`).textContent = `${results.loanTenure} years`;
        document.getElementById(`${prefix}monthlyInstallment`).textContent = formatCurrency(results.monthlyInstallment);
        
        // Update loan eligibility display without percentage
        document.getElementById(`${prefix}loanEligibilityLabel`).textContent = 'Estimated Loan Eligibility:';
        document.getElementById(`${prefix}loanEligibility`).textContent = formatCurrency(pureIncomeBasedEligibility);
        
        // Update downpayment information
        document.getElementById(`${prefix}minCashDownpaymentLabel`).innerHTML = 
            `Minimum Cash Downpayment (<span style="color: #1EA8E0; display: inline; font-size: inherit; font-weight: inherit;">${formatPercentage(params.MIN_CASH_PERCENTAGE * 100)}</span>):`;
        document.getElementById(`${prefix}minCashDownpayment`).textContent = formatCurrency(minCashDownpayment);
        
        document.getElementById(`${prefix}balanceDownpaymentLabel`).innerHTML = 
            `Balance Cash/CPF Downpayment (<span style="color: #1EA8E0; display: inline; font-size: inherit; font-weight: inherit;">${formatPercentage(balanceDownpaymentPercentage)}</span>):`;
        document.getElementById(`${prefix}balanceDownpayment`).textContent = formatCurrency(balanceDownpayment);
    
        // Handle conditional results section
        const conditionalResults = document.getElementById(`${prefix}conditionalResults`);
        const fundsHeader = conditionalResults.querySelector('.funds-header h3');
        const fundsDetails = conditionalResults.querySelector('.funds-details');
    
        // Check if income-based eligibility meets or exceeds theoretical maximum
        const standardMaxPercentage = (params.MAX_LOAN_PERCENTAGE * 100);
        if (pureIncomeBasedEligibility >= theoreticalMaxLoan) {
            fundsHeader.innerHTML = `
                <div class="success-message">
                    <span class="success-message-icon">✓</span>
                    <span class="success-message-text">
                        Congratulations! You qualify for the maximum ${formatPercentage(standardMaxPercentage)} loan amount based on the information provided.
                    </span>
                </div>
            `;
            fundsDetails.style.display = 'none';
        } else if (results.pledgeFundData && Object.keys(results.pledgeFundData).length > 0) {
            fundsHeader.innerHTML = `
                <div class="shortfall-info">
                    <div class="shortfall-line">
                        Loan Shortfall: <span class="shortfall-amount">${formatCurrency(loanShortfall)}</span>
                    </div>
                    <div class="loan-header">
                        To loan the maximum <span class="highlight-text">${formatPercentage(standardMaxPercentage)}</span> either:
                    </div>
                </div>
            `;
            fundsDetails.style.display = 'block';
            document.getElementById(`${prefix}pledgeFund`).textContent = formatCurrency(results.pledgeFundData.pledgeFund);
            document.getElementById(`${prefix}showFund`).textContent = formatCurrency(results.pledgeFundData.showFund);
        }
    
        // Add styles if not already present
        if (!document.querySelector('.calculator-styles')) {
            const style = document.createElement('style');
            style.className = 'calculator-styles';
            style.textContent = `
                .shortfall-info {
                    padding: 0 0 1.5rem 0;
                    font-size: 0.9375rem;
                    line-height: 1.5;
                }
                .shortfall-line {
                    color: #374151;
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                    font-size: 1rem;
                }
                .shortfall-amount {
                    color: #EF4444;
                    font-weight: 600;
                }
                .loan-header {
                    color: #374151;
                    font-weight: 500;
                    font-size: 1rem;
                }
                .highlight-text {
                    color: #1EA8E0;
                    font-weight: inherit;
                }
                .success-message {
                    padding: 1rem 0.75rem;
                    text-align: left;
                    color: #1EA8E0;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    font-weight: 500;
                    background-color: rgba(30, 168, 224, 0.1);
                    border-radius: 0.5rem;
                    margin: 0.75rem 0;
                    display: flex;
                    align-items: flex-start;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .success-message-icon {
                    flex-shrink: 0;
                    margin-right: 0.75rem;
                    margin-top: 0.125rem;
                    color: #1EA8E0;
                }
                .success-message-text {
                    flex: 1;
                    min-width: 0;
                    word-wrap: break-word;
                }
                @media (min-width: 640px) {
                    .success-message {
                        padding: 1.25rem;
                        font-size: 1rem;
                        text-align: center;
                        align-items: center;
                    }
                    .success-message-icon {
                        margin-top: 0;
                    }
                    .shortfall-info {
                        font-size: 1rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    updatePropertyTenure(propertyType) {
        // Update both standard and alternative tenures
        const propertyTenureElements = document.querySelectorAll('.property-tenure, .alt-property-tenure');
        propertyTenureElements.forEach(element => {
            if (element.classList.contains('alt-property-tenure')) {
                element.textContent = propertyType === 'hdb' ? '30' : '35';
            } else {
                element.textContent = propertyType === 'hdb' ? '25' : '30';
            }
        });
    }

    updatePackageDetails(tenureElement, type) {
        const params = type === 'standard' ? this.STANDARD_PARAMS : this.ALTERNATIVE_PARAMS;
        const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
        tenureElement.textContent = propertyType === 'hdb' ? params.TENURE_HDB : params.TENURE_PRIVATE;
    }

    hideConditionalResults() {
        this.conditionalResults.classList.add('hidden');
    }
}

// Initialize the calculator
document.addEventListener('DOMContentLoaded', () => {
    new LoanCalculator();
});

// Add this to your calculator page JavaScript
window.addEventListener('load', function() {
    // Function to send height to parent
    function sendHeight() {
        const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );
        
        window.parent.postMessage({
            type: 'setHeight',
            height: height
        }, '*');
    }

    // Create ResizeObserver to watch for content changes
    const resizeObserver = new ResizeObserver(() => {
        sendHeight();
    });

    // Observe both body and documentElement
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    // Also watch for DOM changes
    const mutationObserver = new MutationObserver(() => {
        sendHeight();
    });

    // Observe DOM changes
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        sendHeight();
    });

    // Initial height send
    setTimeout(sendHeight, 100);
});

// Add this if you need to handle modal states
function showModal() {
    window.parent.postMessage({ type: 'showModal' }, '*');
}

function closeModal() {
    window.parent.postMessage({ type: 'closeModal' }, '*');
}

// Add this if you need to show notifications
function showNotification(type, title, message, icon = '') {
    window.parent.postMessage({
        type: 'showNotification',
        notification: {
            type: type,
            title: title,
            message: message,
            icon: icon
        }
    }, '*');
}