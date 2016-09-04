flag = 'hello'
def generate_flag(random):
	return 2 * random.randint(1, 500)
def generate_problem(random, pid):
	return {'description': 'what is twice ' + str(random.randint(1, 500)) + '?'}
def grade(autogen, candidate):
	try:
		if int(candidate) == generate_flag(autogen):
			return True, 'Nice!'
		return False, 'Nope.'
	except:
		return False, 'Nope.'
