//
//  CBLiteError.swift
//  Plugin
//
//  Created by Thomas O'Reilly on 9/16/21.
//  Copyright © 2021 Max Lynch. All rights reserved.
//

import Foundation

internal enum CBLiteError: Error {
    case documentNotFound
    case revisionMismatch
    case invalidQuery
    case callbackNotRegistered
    case callbackError(_ str: Any)
}
