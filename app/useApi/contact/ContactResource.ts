import { createResource } from '../createResource.js'
import { listContact, createContact, updateContact, deleteContact } from './Contact.js'

export function createContactResource() {
  return createResource({
    list: listContact,
    create: createContact,
    update: updateContact,
    remove: deleteContact,
  })
}
