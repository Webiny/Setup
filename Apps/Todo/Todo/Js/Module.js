import BaseModule from '/Core/Base/BaseModule'
import ListComponent from '/Apps/Todo/Todo/Js/Components/List/List'
import FormComponent from '/Apps/Todo/Todo/Js/Components/Form/Form'
import TasksStore from '/Apps/Todo/Todo/Js/Stores/TasksStore'

class Todo extends BaseModule {

	registerRoutes() {

		return {
			'/Todo/Todo': {
				MainContent: {
					component: ListComponent.createInstance(),
					props: {
						saveState: true
					}
				}
			},
			'/Todo/Todo/:id': {
				MainContent: {
					component: FormComponent.createInstance()
				}
			}
		}
	}

	registerStores() {
		return [
			TasksStore
		];
	}
}

export default Todo;