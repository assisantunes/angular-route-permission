(function(){
    'use strict';

    angular.module('ARoutePermission').factory('$arp_permissions',

    /** @ngInject */
    function(){
        function runResolvers(__resolvers, callback){
            if(!__resolvers || !__resolvers.length){ callback(); return; }
            var okCount = 0;
            var done=function(){
                okCount++;
                if(okCount == __resolvers.length) callback();
            }
            for(var i in __resolvers){
                __resolvers[i]().finally(function(){done();});
            }
        }

        return {
            run:function(arPermissions, callback){
                if(!arPermissions.length){ callback(true); return; }
                var _this = this;
                var i = 0;
                var length_permissions = arPermissions.length;

                function __run(){
                    console.log('[ARoutePermission]', 'Running permission:', arPermissions[i]);
                    _this.test(arPermissions[i], function(status, exception){
                        i++;

                        console.log('[ARoutePermission]', 'Permission status:', status, exception || '');

                        if(!status){
                            callback(false, exception);
                        }else{
                            if(i < length_permissions)  __run();
                            else                        callback(true);
                        }
                    });
                }
                __run();
            },
            test:function(permission, callback){
                if(!(this.permissions[permission] instanceof Object)) throw "Permission '"+permission+"' not registered";
                var permission = this.permissions[permission];
                runResolvers(permission.resolvers, function(){
                    var result = permission.test();
                    if(result === true){
                        callback(true);
                    }else if(typeof result === 'object' && result.$$arp){
                        callback(false, result);
                    }else{
                        callback(false);
                    }
                });
            },
            add:function(permission, test, resolvers){
                if(this.permissions[permission]) throw "Permission '"+permission+"' already added";
                this.permissions[permission] = { test:test, resolvers:resolvers };
            },
            permissions:{}
        }
    });
})();
