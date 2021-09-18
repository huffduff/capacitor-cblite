#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(CBLitePlugin, "CBLite",
           CAP_PLUGIN_METHOD(open, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(sync, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(updateSessionID, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(stopSync, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(destroy, CAPPluginReturnNone);
           // Document methods
           CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(put, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(remove, CAPPluginReturnNone);
           // Index and Query methods
           CAP_PLUGIN_METHOD(indexes, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(createIndex, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(registerScript, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(query, CAPPluginReturnPromise);
)
