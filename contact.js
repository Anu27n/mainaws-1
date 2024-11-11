angular.module('contactApp', [])
    .controller('ContactController', ['$http', function($http) {
        var self = this;
        self.formData = {
            name: '',
            email: '',
            query: ''
        };
        self.showMessage = false;
        self.message = '';
        self.messageClass = '';

        self.submitForm = function() {
            // Reset message and messageClass on each form submission
            self.showMessage = false;
            self.message = '';
            self.messageClass = '';

            $http({
                method: 'POST',
                url: '/submitQuery', // Update to match your server endpoint
                data: self.formData
            })
            .then(function(response) {
                // Success
                self.showMessage = true;
                self.message = response.data.message; // Assuming your server sends a response with a 'message' field
                self.messageClass = 'success';
            })
            .catch(function(error) {
                // Error
                console.error('Error submitting form:', error);
                self.showMessage = true;
                self.message = 'An error occurred. Please try again later.'; // Generic error message
                self.messageClass = 'error';
            });
        };
    }]);
