(function(){
    'use strict';

    angular.module('PermissionManager').factory('PermissionExceptions',

    /** @ngInject */
    function(PermissionManager, $location){
        // Build the reject object for the exception
        var result = function(){
          var _arguments = arguments;
          var _this = this;
          return {
            // Just to the listener of "$routeChangeError" event identify that this is a exception from the PermissionManager
            $$permission_manager:true,
            // The method to run the exception
            $$do:function(){ _this.$$do.apply(_this, _arguments); },
          }
        }

        function RedirectException(){
            if(!(this.redirect = arguments[0]))
                throw 'RedirectException require "path" as parameter';

            // Force resolve router after complete;
            if(typeof arguments[1] === 'boolean'){
                this.resolve_final_path = Boolean(arguments[1] === true);
            }else if(typeof arguments[1] === 'string'){
                this.final_path = arguments[1];
            }

            // Include the redirect parameter on the url
            if(typeof arguments[2] === 'string'){
                this.redirect_param = arguments[2];
            }
        }
        RedirectException.prototype = {
            name:'RedirectException', result:result,
            $$do:function(){
                if(this.resolve_final_path) arguments[0] = $location.absUrl();
                if(this.final_path) arguments[0] = this.final_path;

                // Converting route to path
                if(typeof arguments[0] == 'object') arguments[0] = (arguments[0].__path || null);

                console.log('[PermissionManager]', 'RedirectException [redirect:'+this.redirect+'] intent:', arguments[0]);
                PermissionManager.$$redirectTo(this.redirect, arguments[0], this.redirect_param ? this.redirect_param : null);
            }
        }

        function NotAllowException(){}
        NotAllowException.prototype = {
            name:'NotAllowException', result:result,
            $$do:function(){
                if(PermissionManager.$$is_first_route) PermissionManager.$$redirectTo('/');
            }
        }

        return {
          Redirect:function(){return new RedirectException(arguments[0], arguments[1], arguments[2])},
          NotAllow:function(){return new NotAllowException(arguments[0], arguments[1], arguments[2])}
        };
    });

})();
