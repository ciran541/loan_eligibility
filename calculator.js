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

        // Common constants for calculations
        this.STRESS_TEST_RATE = 0.042; // 4.2% annual interest rate
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

        // Track touched fields for validation
        this.touchedFields = new Set();

        this.initializeFormState();
        this.initializeEventListeners();
        this.calculateLoanEligibility();
    }

    initializeFormState() {
        // Hide Borrower 2 section initially
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
    }

    toggleBorrower2Fields() {
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        this.borrower2Section.classList.toggle('hidden', isSingle);
        
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

        if (status === 'employed') {
            basicSalaryGroup.classList.remove('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = true;
            noaInput.required = false;
        } else {
            basicSalaryGroup.classList.add('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = false;
            noaInput.required = true;
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
    
            // Calculate loan amount using stress test rate
            const stressMonthlyRate = this.STRESS_TEST_RATE / 12;
            const monthsTotal = tenure * 12;
            const loanAmount = this.calculatePV(stressMonthlyRate, monthsTotal, monthlyPayment);
    
            // Calculate actual monthly installment
            const actualMonthlyRate = this.MONTHLY_INSTALLMENT_RATE / 12;
            const actualMonthlyPayment = Math.abs(loanAmount * actualMonthlyRate * 
                Math.pow(1 + actualMonthlyRate, monthsTotal) / 
                (Math.pow(1 + actualMonthlyRate, monthsTotal) - 1));
    
            // Calculate loan percentage
            const loanPercentage = Math.min((loanAmount / propertyValue) * 100, params.MAX_LOAN_PERCENTAGE * 100);
    
            // Calculate pledge funds if loan percentage < max loan percentage
            let pledgeFundData = null;
            if (loanPercentage < (params.MAX_LOAN_PERCENTAGE * 100)) {
                const cappedLoanAmount = propertyValue * params.MAX_LOAN_PERCENTAGE;
                const shortfallLoanAmount = cappedLoanAmount - loanAmount;
                
                // Calculate monthly shortfall using stress test rate
                const shortfallPayment = monthlyPayment * (shortfallLoanAmount / loanAmount);
                
                const pledgeDivisor = propertyType === 'hdb' ? 0.3 : 0.55;
                const pledgeFund = (shortfallPayment * 48) / pledgeDivisor;
                const showFund = pledgeFund / 0.3;
    
                pledgeFundData = { pledgeFund, showFund };
            }
    
            return {
                weightedAge: this.calculateWeightedAverageAge(),
                loanTenure: tenure,
                propertyValue: propertyValue,
                loanAmount: loanAmount,
                monthlyInstallment: actualMonthlyPayment,
                maxLoanPercentage: params.MAX_LOAN_PERCENTAGE,
                pledgeFundData: pledgeFundData
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

    updateResults(results, type) {
        const prefix = type === 'standard' ? '' : 'alt-';
        const formatCurrency = (number) => `SGD ${Math.floor(number).toLocaleString()}`;
        const params = type === 'standard' ? this.STANDARD_PARAMS : this.ALTERNATIVE_PARAMS;
        
        // Calculate maximum bank loan based on property value
        const maxBankLoan = results.propertyValue * results.maxLoanPercentage;
        
        // Use the lower of loan eligibility or maximum bank loan
        const actualLoanAmount = Math.min(results.loanAmount, maxBankLoan);
        
        // Calculate downpayments
        const minCashDownpayment = results.propertyValue * params.MIN_CASH_PERCENTAGE;
        const balanceDownpayment = results.propertyValue - (actualLoanAmount + minCashDownpayment);
        
        // Update main results
        document.getElementById(`${prefix}weightedAge`).textContent = `${results.weightedAge} years`;
        document.getElementById(`${prefix}loanTenure`).textContent = `${results.loanTenure} years`;
        document.getElementById(`${prefix}targetPrice`).textContent = formatCurrency(results.propertyValue);
        document.getElementById(`${prefix}loanEligibility`).textContent = formatCurrency(results.loanAmount);
        document.getElementById(`${prefix}maxBankLoan`).textContent = formatCurrency(maxBankLoan);
        document.getElementById(`${prefix}monthlyInstallment`).textContent = formatCurrency(results.monthlyInstallment);
        document.getElementById(`${prefix}minCashDownpayment`).textContent = formatCurrency(minCashDownpayment);
        document.getElementById(`${prefix}balanceDownpayment`).textContent = formatCurrency(balanceDownpayment);
    
        // Update conditional results (pledge and show funds)
        const conditionalResultsElement = document.getElementById(`${prefix}conditionalResults`);
        if (results.pledgeFundData) {
            document.getElementById(`${prefix}pledgeFund`).textContent = formatCurrency(results.pledgeFundData.pledgeFund);
            document.getElementById(`${prefix}showFund`).textContent = formatCurrency(results.pledgeFundData.showFund);
            conditionalResultsElement.classList.remove('hidden');
        } else {
            conditionalResultsElement.classList.add('hidden');
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