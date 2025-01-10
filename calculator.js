class LoanCalculator {
    constructor() {
        this.form = document.getElementById('loanCalculatorForm');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.borrower2Section = document.getElementById('borrower2Details');
        this.conditionalResults = document.getElementById('conditionalResults');
        
        // Constants for calculations
        this.STRESS_TEST_RATE = 0.042; // 4.8% annual interest rate
        this.MONTHLY_INSTALLMENT_RATE = 0.025; // 2.5% annual interest rate for monthly installment
        this.MAX_AGE_LIMIT = 65;
        this.MSR_LIMIT = 0.30; // 30% for MSR
        this.TDSR_LIMIT = 0.55; // 55% for TDSR
        this.MAX_LOAN_PERCENTAGE = 0.75; // 75% maximum loan
        this.NOA_FACTOR = 0.7; // 70% of NOA income considered

        // Track touched fields for validation
        this.touchedFields = new Set();

        this.initializeFormState();
        this.initializeEventListeners();
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
        const basicSalaryGroup = document.getElementById(`${borrower}BasicSalaryGroup`);
        const noaGroup = document.getElementById(`${borrower}NoaGroup`);
        const basicSalaryInput = document.getElementById(`${borrower}BasicSalary`);
        const noaInput = document.getElementById(`${borrower}NOA`);

        if (status === 'employed') {
            // For employed: Show both fields, basic salary required
            basicSalaryGroup.classList.remove('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = true;
            noaInput.required = false;
        } else {
            // For self-employed: Hide basic salary, show NOA as required
            basicSalaryGroup.classList.add('hidden');
            noaGroup.classList.remove('hidden');
            basicSalaryInput.required = false;
            noaInput.required = true;
            
            // Clear basic salary value
            basicSalaryInput.value = '';
            basicSalaryInput.classList.remove('error');
            const errorElement = document.getElementById(`${basicSalaryInput.id}Error`);
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
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
        // Updated PV calculation
        const monthlyRate = rate;
        return Math.abs(pmt) * (1 - Math.pow(1 + monthlyRate, -nper)) / monthlyRate;
    }

    calculateLoanTenure() {
        const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
        const weightedAge = this.calculateWeightedAverageAge();
        const maxPropertyTenure = propertyType === 'hdb' ? 25 : 30;
        return Math.min(this.MAX_AGE_LIMIT - weightedAge, maxPropertyTenure);
    }

    calculateLoanEligibility() {
        try {
            // Get basic inputs
            const propertyValue = parseFloat(document.getElementById('propertyValue').value);
            const totalIncome = this.calculateTotalIncome();
            const totalCommitments = this.calculateTotalCommitments();
            const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
            const tenure = this.calculateLoanTenure();
    
            // Calculate TDSR available (55% of income minus commitments)
            const tdsrAvailable = Math.max((totalIncome * this.TDSR_LIMIT) - totalCommitments, 0);
            
            // Calculate MSR available (30% of income) - only for HDB
            const msrAvailable = totalIncome * this.MSR_LIMIT;
            
            // Determine monthly payment capacity
            const monthlyPayment = (propertyType === 'hdb') ? 
                Math.min(msrAvailable, tdsrAvailable) : tdsrAvailable;
    
            // Calculate loan amount using stress test rate (4.2%)
            const stressMonthlyRate = this.STRESS_TEST_RATE / 12;
            const monthsTotal = tenure * 12;
            const loanAmount = this.calculatePV(stressMonthlyRate, monthsTotal, monthlyPayment);
    
            // Calculate actual monthly installment using 2.5% rate
            const actualMonthlyRate = this.MONTHLY_INSTALLMENT_RATE / 12;
            const actualMonthlyPayment = Math.abs(loanAmount * actualMonthlyRate * 
                Math.pow(1 + actualMonthlyRate, monthsTotal) / 
                (Math.pow(1 + actualMonthlyRate, monthsTotal) - 1));
    
            // Calculate loan percentage (capped at 75%)
            const loanPercentage = Math.min((loanAmount / propertyValue) * 100, 75);
    
            // Update results
            this.updateResults({
                weightedAge: this.calculateWeightedAverageAge(),
                loanTenure: tenure,
                propertyValue: propertyValue,
                loanAmount: loanAmount,
                monthlyInstallment: actualMonthlyPayment,
                loanPercentage: loanPercentage
            });
    
            // Handle shortfall calculations if loan percentage < 75%
            if (loanPercentage < 75) {
                const cappedLoanAmount = propertyValue * 0.75;
                const shortfallLoanAmount = cappedLoanAmount - loanAmount;
                
                // Calculate monthly shortfall using stress test rate (4.2%)
                const shortfallPayment = monthlyPayment * (shortfallLoanAmount / loanAmount);
                
                const pledgeDivisor = propertyType === 'hdb' ? 0.3 : 0.55;
                const pledgeFund = (shortfallPayment * 48) / pledgeDivisor;
                const showFund = pledgeFund / 0.3;
    
                this.updateConditionalResults(pledgeFund, showFund);
            } else {
                this.hideConditionalResults();
            }
    
        } catch (error) {
            console.error('Error calculating loan eligibility:', error);
        }
    }

    
    updateResults(results) {
        const formatCurrency = (number) => `SGD ${Math.floor(number).toLocaleString()}`;
        
        // Fixed percentages
        const MIN_CASH_PERCENTAGE = 0.05; // 5%
        const MAX_LOAN_PERCENTAGE = 0.75; // 75%
        
        // Calculate maximum bank loan based on property value
        const maxBankLoan = results.propertyValue * MAX_LOAN_PERCENTAGE;
        
        // Use the lower of loan eligibility or maximum bank loan for final calculations
        const actualLoanAmount = Math.min(results.loanAmount, maxBankLoan);
        
        // Calculate downpayments
        const minCashDownpayment = results.propertyValue * MIN_CASH_PERCENTAGE;
        const balanceDownpayment = results.propertyValue - (actualLoanAmount + minCashDownpayment);
        
        // Update display
        document.getElementById('weightedAge').textContent = `${results.weightedAge} years`;
        document.getElementById('loanTenure').textContent = `${results.loanTenure} years`;
        document.getElementById('targetPrice').textContent = formatCurrency(results.propertyValue);
        document.getElementById('loanEligibility').textContent = formatCurrency(results.loanAmount);
        document.getElementById('maxBankLoan').textContent = formatCurrency(maxBankLoan);
        document.getElementById('monthlyInstallment').textContent = formatCurrency(results.monthlyInstallment);
        document.getElementById('minCashDownpayment').textContent = formatCurrency(minCashDownpayment);
        document.getElementById('balanceDownpayment').textContent = formatCurrency(balanceDownpayment);
        
    }

    updateConditionalResults(pledgeFund, showFund) {
        const formatCurrency = (number) => `SGD ${Math.floor(number).toLocaleString()}`;
        
        this.conditionalResults.classList.remove('hidden');
        document.getElementById('pledgeFund').textContent = formatCurrency(pledgeFund);
        document.getElementById('showFund').textContent = formatCurrency(showFund);
    }

    hideConditionalResults() {
        this.conditionalResults.classList.add('hidden');
    }
}

// Initialize the calculator
document.addEventListener('DOMContentLoaded', () => {
    new LoanCalculator();
});