from flask import current_app as app, Blueprint, request, session

from decorators import api_wrapper, login_required, team_required, WebException
from models import db, Problems, ProgrammingSubmissions, Solves

import imp
import os
import shutil
import subprocess

import problem
import user
import utils

blueprint = Blueprint("programming", __name__)

extensions = {
	"python2": "py",
	"python3": "py",
	"java": "java"
}

@blueprint.route("/submissions", methods=["GET"])
@api_wrapper
@login_required
@team_required
def get_submissions():
	submissions_return = []
	tid = session.get("tid")
	submissions = ProgrammingSubmissions.query.filter_by(tid=tid).all()
	if submissions is not None:
		counter = 1
		for submission in submissions:
			_problem = problem.get_problem(pid=submission.pid).first()
			submissions_return.append({
				"title": _problem.title if _problem else "",
				"message": submission.message,
				"log": submission.log,
				"date": utils.isoformat(submission.date),
				"number": counter
			})
			counter += 1
	return { "success": 1, "submissions": submissions_return }

@blueprint.route("/problems", methods=["GET"])
@api_wrapper
@login_required
@team_required
def get_problems():
	data = []
	problems = Problems.query.filter_by(category="Programming").all()
	if problems is not None:
		for _problem in problems:
			data.append({
				"title": _problem.title,
				"pid": _problem.pid
			})

	return { "success": 1, "problems": data }

@blueprint.route("/submit", methods=["POST"])
@api_wrapper
@login_required
@team_required
def submit_program():
	params = utils.flat_multi(request.form)

	pid = params.get("pid")
	tid = session.get("tid")
	_user = user.get_user().first()

	language = params.get("language")
	submission_contents = params.get("submission")

	_problem = problem.get_problem(pid=pid).first()
	if _problem is None:
		raise WebException("Problem does not exist.")

	if _problem.category != "Programming":
		raise WebException("Can't judge this problem.")

	solved = Solves.query.filter_by(pid=pid, tid=tid, correct=1).first()
	if solved:
		raise WebException("You already solved this problem.")

	judge_folder = os.path.join(app.config["GRADER_FOLDER"], pid)
	if not os.path.exists(judge_folder):
		os.makedirs(judge_folder)

	submission_folder = os.path.join(judge_folder, utils.generate_string())
	while os.path.exists(submission_folder):
		submission_folder = os.path.join(judge_folder, utils.generate_string())

	os.makedirs(submission_folder)

	submission_path = os.path.join(submission_folder, "program.%s" % extensions[language])

	open(submission_path, "w").write(submission_contents)
	message, log = judge(submission_path, language, pid)

	submission = ProgrammingSubmissions(pid, tid, submission_path, message, log)

	with app.app_context():
		if message == "Correct!":
			solve = Solves(pid, _user.uid, tid, "PLACEHOLDER", True)
			db.session.add(solve)
		db.session.add(submission)
		db.session.commit()

	shutil.rmtree(submission_folder)

	return { "success": message == "Correct!", "message": message }

def judge(submission_path, language, pid):

	if not os.path.exists(submission_path):
		raise WebException("Program is missing.")

	_problem = problem.get_problem(pid=pid).first()
	if _problem is None:
		raise WebException("Problem does not exist.")

	submission_root = os.path.dirname(submission_path)
	os.chdir(submission_root)
	log = ""
	message = ""

	log += "Compiling...\n"
	try:
		if language == "python2":
			subprocess.check_output("python -m py_compile %s" % submission_path, shell=True)
		elif language == "python3":
			subprocess.check_output("python3 -m py_compile %s" % submission_path, shell=True)
		elif language == "java":
			subprocess.check_output("javac %s" % submission_path, shell=True)
		else:
			message = "Not implemented."
			return message, log
	except subprocess.CalledProcessError as e:
		# TODO: Extract useful error messages from exceptions and add timeout
		#log += "There was a problem with compiling.\n%s\n" % str(e)
		message = "There was a problem with compiling."

		return message, log

	log += "Compiled.\n"

	try:
		judge = imp.load_source("judge", _problem.grader)
	except Exception, e:
		message = "An error occured. Please notify an admin immediately."
		log += "Could not load judge.\n"
		return message, log

	_input = os.path.join(submission_root, judge.INFILE)
	_output = os.path.join(submission_root, judge.OUTFILE)
	for i in range(judge.TEST_COUNT):
		log += "Running test #%s\n" % i

		try:
			correct = judge.generate(submission_root)
		except Exception, e:
			message = "An error occured. Please notify an admin immediately."
			log += "Could not generate input for test #%s.\n" % i
			return message, log

		try:
			if language == "python2":
				subprocess.check_output("python %s" % submission_path, shell=True)
			elif language == "python3":
				subprocess.check_output("python3 %s" % submission_path, shell=True)
			elif language == "java":
				subprocess.check_output("java program", shell=True)
		except subprocess.CalledProcessError as e:
			#log += "Program threw an exception:\n%s\n" % str(e)
			message = "Program crashed."
			return message, log

		if not os.path.exists(_output):
			message = "Your program did not produce an output."
			log += "Could not find program output.\n"
			return message, log

		program_output = open(_output, "r").read()
		if correct != program_output:
			message = "Incorrect."
			log += "Test #%s failed.\n\n" % i
			log += "Input:\n%s\n\n" % open(_input, "r").read()
			log += "Output:\n%s\n\n" % program_output
			log += "Expected:\n%s\n\n" % correct
			return message, log
		else:
			log += "Test #%s passed!\n" % i

		os.remove(_output)

	message = "Correct!"
	log += "All tests passed."

	return message, log
