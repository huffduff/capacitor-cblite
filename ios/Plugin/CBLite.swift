import Foundation
import Capacitor
import CouchbaseLiteSwift

@objc public class CBLite: NSObject {
    internal let database: Database
    
    internal var replicator: CBLiteReplicator?
    
    private var changeToks: [ListenerToken] = []
    
    init(_ name: String) throws {
        let tempFolder = NSTemporaryDirectory().appending("cbllog")
        Database.log.file.config = LogFileConfiguration(directory: tempFolder)
        // TODO make this configurable
        Database.log.file.level = .info

        print("initializing database \(name)")
        self.database = try Database.init(name: name)
    }
    
    internal func setRemote(_ host: String) -> CBLiteReplicator {
        if replicator == nil {
            replicator = CBLiteReplicator(self, url: host)
        }
        return replicator!
    }
    
    internal func watchChanges(_ cap: CAPPlugin) -> CBLite {
        let label = "cblite:\(database.name):change"
        let tok = database.addChangeListener { (change) in
            for id in change.documentIDs {
                do {
                    let doc = try self.get(id)
                    cap.notifyListeners(label, data: doc)
                } catch {
                    // ignore missing documents?
                }
            }
        }
        changeToks.append(tok)
        return self
    }
    
    // stopped, offline, connecting, idle, busy (completed and total should be ignored?)
    // This should ALWAYS fire on replication?
    internal func get(_ id: String) throws -> [String: Any] {
        guard let doc = database.document(withID: id) else {
            throw CBLiteError.documentNotFound
        }
        var asDict = doc.toDictionary()
        asDict["_id"] = doc.id
        asDict["_rev"] = doc.revisionID
        return asDict
    }
    
    internal func get(_ id: String, _rev: String?) throws -> [String: Any] {
        let doc = try get(id)
        if _rev != nil && (doc["_rev"] as! String) != _rev {
            throw CBLiteError.revisionMismatch
        }
        return doc
    }
    
    internal func put(_ _id: String, _rev: String?, data: JSObject) throws -> MutableDocument {
        var doc = database.document(withID: _id)?.toMutable()
        if (doc == nil) {
            if _rev != nil {
                throw CBLiteError.documentNotFound
            }
            doc = MutableDocument(id: _id)
        }
        if _rev != nil && _rev != doc?.revisionID {
            throw CBLiteError.revisionMismatch
        }
        doc!.setData(data)
        try database.saveDocument(doc!)
        return doc!
    }
    
    internal func remove(_ _id: String, _rev: String) throws {
        let doc = database.document(withID: _id)
        if (doc == nil) {
            throw CBLiteError.documentNotFound
        }
        
        if (doc!.revisionID != _rev) {
            throw CBLiteError.revisionMismatch
        }
        try database.deleteDocument(doc!)
    }
    
    internal func delete() throws {
        for tok in changeToks {
            database.removeChangeListener(withToken: tok)
        }
        try database.delete()
    }
    
    internal func indexes() -> [String] {
        return database.indexes
    }
    
    internal func createIndex(_ name: String, fields: [String]) throws -> Bool {
        // if no name submitted, generate one from the fields requested
    
        if database.indexes.contains(name) {
            // it already exists, return false
            return false
        }
        
        var items: [ValueIndexItem] = []
        for field in fields {
            items.append(ValueIndexItem.expression(Expression.property(field)))
        }
        let prepped = IndexBuilder.valueIndex(items: items)
        
        try database.createIndex(prepped, withName: name)
        // created, return true
        return true
    }
    
    private func query(_ q: Query) throws -> [Any] {
        // TODO tighten up type? [Dictionary<String, Any>], or even more specific?
        var rows: [Any] = []
        for result in try q.execute() {
            if result.contains(key: "doc") {
                // flattens structure built by find()
                var doc = result.dictionary(forKey: "doc")!.toDictionary()
                if let _id = result.string(forKey: "_id") {
                    doc["_id"] = _id
                }
                rows.append(doc)
            } else {
                rows.append(result.toDictionary())
            }
        }
        return rows
    }
    
    internal func query(_ src: String) throws -> [Any] {
        let q = QueryBuilder.fromNQL(database: database, expressions: src)
        return try query(q)
    }
    
    internal func query(_ src: JSObject) throws -> [Any] {
        let data = try JSONSerialization.data(withJSONObject: src, options: [])
        let q = QueryBuilder.fromJSON(database: database, JSONRepresentation: data)
        return try query(q)
    }
}
